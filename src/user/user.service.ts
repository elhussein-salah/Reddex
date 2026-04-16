import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateUserDto, UpdateUserDto } from './dto';
import { ApiResponse } from '../common/interfaces/api.response';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadFolder } from '../enums';
import { Role } from 'src/generated/prisma/enums';
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
  async findAll() {
    return this.prisma.users.findMany({ select: USER_SELECT });
  }

  // async findById(id: number) {
  //   const user = await this.prisma.users.findUnique({
  //     where: { id },
  //     select: USER_SELECT,
  //     include: {
  //       patients: true,
  //     },
  //   });

  //   if (!user) {
  //     throw new NotFoundException(`User with ID ${id} not found`);
  //   }

  //   return user;
  // }

  async findByEmail(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: USER_SELECT,
    });

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

  async getProfile(dto: { sub: number; role: string }) {
    if (dto.role === 'DOCTOR') {
      const doctor = await this.prisma.doctors.findUnique({
        where: { userId: dto.sub },
        include: { user: true },
      });

      if (!doctor) throw new NotFoundException('not found');

      return doctor;
    }

    if (dto.role === 'PATIENT') {
      const patient = await this.prisma.patients.findUnique({
        where: { userId: dto.sub },
        include: { user: true },
      });

      if (!patient) throw new NotFoundException('not found');

      return patient;
    }

    throw new BadRequestException('invalid data');
  }
  // ================= UPDATE =================
  async update(id: number, data: UpdateUserDto): Promise<ApiResponse> {
    await this.ensureUserExists(id);

    if (data.email) {
      await this.ensureEmailNotTaken(data.email, id);
    }

    const updateData = { ...data };

    if (updateData.password) {
      updateData.password = await argon2.hash(updateData.password);
    }

    if (updateData.phone) {
      updateData.phone = normalizePhone(updateData.phone);
    }

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

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmailWithPassword(email);
    if (!user) return false;
    return await argon2.verify(user.password, password);
  }
}
