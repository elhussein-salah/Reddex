import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateUserDto, UpdateUserDto } from './dto';
import { ApiResponse } from '../common/interfaces/api.response';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadFolder } from '../enums';
import { Gender, Role } from 'src/generated/prisma/enums';
import { normalizePhone } from 'src/common/utils/phone.util';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  photourl: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
} as const;

/** Same as USER_SELECT but with the nested user relation (for profile joins) */
const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  photourl: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ================= CREATE =================
  async create(
    data: CreateUserDto,
    role: Role,
    folderName: UploadFolder,
    file?: Express.Multer.File,
  ) {
    await this.ensureEmailNotTaken(data.email);

    const hashedPassword = await argon2.hash(data.password);

    let uploadedImage: { url: string; publicId: string } | null = null;

    if (file) {
      uploadedImage = await this.uploadProfileImage(folderName, file);
    }

    try {
      const user = await this.prisma.users.create({
        data: {
          name: data.name,
          email: data.email,
          phone: normalizePhone(data.phone),
          password: hashedPassword,
          role: role,
          photourl: uploadedImage?.url ?? null,
          gender: data.gender,
          SSN: data.SSN,
          birthdate: new Date(data.birthdate),
        },
        select: USER_SELECT,
      });

      return user;
    } catch (error: unknown) {
      await this.rollbackImageUpload(uploadedImage);
      throw error;
    }
  }

  // ================= READ =================
  async findAll(pagination: {
    skip: number;
    take: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        select: USER_SELECT,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      this.prisma.users.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.floor(pagination.skip / pagination.take) + 1,
        limit: pagination.take,
        totalPages: Math.ceil(total / pagination.take),
      },
    };
  }

  /**
   * Returns the user or `null` — never throws.
   * Use this in flows where a missing user is not an error (e.g. forgot-password).
   */
  async findByEmailOrNull(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      select: USER_SELECT,
    });
  }

  /**
   * Returns the user or throws UnauthorizedException.
   * Use this for admin lookups and auth flows where a missing user is an error.
   */
  async findByEmail(email: string) {
    const user = await this.findByEmailOrNull(email);

    if (!user) {
      throw new UnauthorizedException(`invalid credentials`);
    }

    return user;
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      select: { ...USER_SELECT, password: true },
    });
  }

  async createAdmin(data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    gender: Gender;
    SSN: string;
    birthdate: string;
  }) {
    await this.ensureEmailNotTaken(data.email);

    const hashedPassword = await argon2.hash(data.password);

    try {
      return await this.prisma.users.create({
        data: {
          name: data.name,
          email: data.email,
          phone: normalizePhone(data.phone),
          password: hashedPassword,
          role: Role.ADMIN,
          isActive: true,
          photourl: null,
          gender: data.gender,
          SSN: data.SSN,
          birthdate: new Date(data.birthdate),
        },
        select: USER_SELECT,
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email or phone already in use');
      }
      throw error;
    }
  }

  async getProfile(dto: { sub: number; role: string }) {
    if (dto.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctors.findUnique({
        where: { userId: dto.sub },
        include: { user: { select: USER_SAFE_SELECT } },
      });

      if (!doctor) throw new NotFoundException('not found');

      return doctor;
    }

    if (dto.role === Role.PATIENT) {
      const patient = await this.prisma.patients.findUnique({
        where: { userId: dto.sub },
        include: { user: { select: USER_SAFE_SELECT } },
      });

      if (!patient) throw new NotFoundException('not found');

      return patient;
    }

    if (dto.role === Role.ADMIN || dto.role === Role.SUPER_ADMIN) {
      const admin = await this.prisma.users.findUnique({
        where: { id: dto.sub },
        select: USER_SAFE_SELECT,
      });

      if (!admin) throw new NotFoundException('not found');

      return admin;
    }

    throw new BadRequestException('invalid data');
  }
  // ================= UPDATE =================
  async update(id: number, data: UpdateUserDto): Promise<ApiResponse> {
    await this.ensureUserExists(id);

    if (data.email) {
      await this.ensureEmailNotTaken(data.email, id);
    }

    // Prevent role escalation to SUPER_ADMIN
    if (data.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Cannot assign SUPER_ADMIN role via this endpoint',
      );
    }

    // Explicitly pick allowed fields — never spread raw DTO to Prisma
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = normalizePhone(data.phone);
    if (data.role !== undefined) updateData.role = data.role;
    if (data.password !== undefined)
      updateData.password = await argon2.hash(data.password);

    await this.prisma.users.update({
      where: { id },
      data: updateData,
    });

    return {
      message: 'User updated successfully',
      statusCode: 200,
    };
  }

  // ================= DELETE =================
  async remove(id: number): Promise<ApiResponse> {
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.users.delete({ where: { id } });

    // 🔥 optional: delete image after user deletion
    if (user.photourl) {
      const publicId = this.cloudinary.extractPublicId(user.photourl);
      if (publicId) {
        try {
          await this.cloudinary.deleteFile(publicId);
        } catch (error: unknown) {
          const err = this.normalizeError(error);
          this.logger.warn(`Failed to delete image: ${err.message}`);
        }
      }
    }

    return {
      message: 'User deleted successfully',
      statusCode: 200,
    };
  }

  // ================= PRIVATE =================

  private async uploadProfileImage(
    folderName: UploadFolder,
    file: Express.Multer.File,
  ) {
    try {
      return await this.cloudinary.uploadImage(file, folderName);
    } catch (error: unknown) {
      const err = this.normalizeError(error);
      this.logger.error('Image upload failed', err.stack);
      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  private async rollbackImageUpload(
    image: { url: string; publicId: string } | null,
  ) {
    if (!image) return;

    try {
      await this.cloudinary.deleteFile(image.publicId);
    } catch (error: unknown) {
      const err = this.normalizeError(error);
      this.logger.error('Rollback failed', err.stack);
    }
  }

  private async ensureUserExists(id: number): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  private async ensureEmailNotTaken(
    email: string,
    excludeUserId?: number,
  ): Promise<void> {
    const existing = await this.prisma.users.findUnique({
      where: { email },
    });

    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException('Email already in use');
    }
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybePrismaError = error as { code?: unknown };
    return maybePrismaError.code === 'P2002';
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmailWithPassword(email);
    if (!user) return false;
    return await argon2.verify(user.password, password);
  }
}
