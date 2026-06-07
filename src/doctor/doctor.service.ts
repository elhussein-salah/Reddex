// doctor.service.ts
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDoctorDto } from './dto/create.doctor.dto';
import { UpdateDoctorDto } from './dto/update.doctor.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadFolder } from 'src/enums';
import { Prisma } from 'src/generated/prisma/client';
import { normalizePhone } from 'src/common/utils/phone.util';
import { ApiResponse } from 'src/common/interfaces/api.response';

const DOCTOR_SELECT = {
  id: true,
  specialty: true,
  licenseMedicalNumber: true,
  licenseMedicalPhotoUrl: true,
  yearsExperience: true,
  idCardPhotoUrl: true,
  nameOfClinic: true,
  locationOfClinic: true,
  photoOfClinicUrl: true,
  workingHours: true,
  workdays: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      photourl: true,
      SSN: true,
      gender: true,
      birthdate: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

type DoctorWithUser = Prisma.doctorsGetPayload<{
  select: typeof DOCTOR_SELECT;
}>;

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(filter: {
    search?: string;
  }) {
    const where: Prisma.doctorsWhereInput = {};
    if (filter.search) {
      where.user = {
        is: {
          OR: [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const data = await this.prisma.doctors.findMany({
      select: DOCTOR_SELECT,
      where,
    });

    return {
      data,
    };
  }
  async findPendings() {
    const data = await this.prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photourl: true,
        SSN: true,
        gender: true,
        birthdate: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        doctors: {
          select: {
            specialty: true,
            licenseMedicalNumber: true,
            licenseMedicalPhotoUrl: true,
            yearsExperience: true,
            idCardPhotoUrl: true,
            nameOfClinic: true,
            locationOfClinic: true,
            photoOfClinicUrl: true,
            workingHours: true,
            workdays: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      where: { isActive: false, role: 'DOCTOR' },
    });

    return {
      data,
    };
  }
  async findById(id: number): Promise<DoctorWithUser> {
    const doctor = await this.prisma.doctors.findUnique({
      where: { id },
      select: DOCTOR_SELECT,
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    return doctor;
  }

  async createDoctor(
    dto: CreateDoctorDto,
    files?: {
      profilePicture?: Express.Multer.File[];
      licenseMedicalPhotoUrl?: Express.Multer.File[];
      idCardPhotoUrl?: Express.Multer.File[];
      photoOfClinicUrl?: Express.Multer.File[];
    },
  ): Promise<DoctorWithUser> {
    this.logger.log(`Creating doctor for email: ${dto.email}`);

    // Check existing user
    const existingUser = await this.prisma.users.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: normalizePhone(dto.phone) }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }

    // Check existing doctor/user fields
    const prevUserWithSSN = await this.prisma.users.findFirst({
      where: { SSN: dto.SSN },
    });

    const existingDoctor = await this.prisma.doctors.findFirst({
      where: {
        OR: [{ licenseMedicalNumber: dto.licenseMedicalNumber }],
      },
    });

    if (existingDoctor || prevUserWithSSN) {
      throw new ConflictException(
        'SSN or license medical number already exists',
      );
    }

    const hashedPassword = await argon2.hash(dto.password);

    let uploadedProfileImage: { publicId: string; url: string } | null = null;

    let uploadedLicenseImage: { publicId: string; url: string } | null = null;

    let uploadedIdCardImage: { publicId: string; url: string } | null = null;

    let uploadedClinicImage: { publicId: string; url: string } | null = null;

    try {
      // Upload profile image
      if (files?.profilePicture?.[0]) {
        uploadedProfileImage = await this.cloudinary.uploadImage(
          files.profilePicture[0],
          UploadFolder.DOCTOR_PROFILE,
        );
      }

      // Upload license image
      if (files?.licenseMedicalPhotoUrl?.[0]) {
        uploadedLicenseImage = await this.cloudinary.uploadImage(
          files.licenseMedicalPhotoUrl[0],
          UploadFolder.DOCTOR_LICENSE,
        );
      }

      // Upload ID card image
      if (files?.idCardPhotoUrl?.[0]) {
        uploadedIdCardImage = await this.cloudinary.uploadImage(
          files.idCardPhotoUrl[0],
          UploadFolder.DOCTOR_DOCUMENTS,
        );
      }

      // Upload clinic photo
      if (files?.photoOfClinicUrl?.[0]) {
        uploadedClinicImage = await this.cloudinary.uploadImage(
          files.photoOfClinicUrl[0],
          UploadFolder.DOCTOR_CLINIC,
        );
      }

      const doctor = await this.prisma.doctors.create({
        data: {
          specialty: dto.specialty,
          licenseMedicalNumber: dto.licenseMedicalNumber,
          licenseMedicalPhotoUrl: uploadedLicenseImage?.url ?? '',
          yearsExperience: Number(dto.yearsExperience),
          idCardPhotoUrl: uploadedIdCardImage?.url ?? '',
          nameOfClinic: dto.nameOfClinic ?? null,
          locationOfClinic: dto.locationOfClinic ?? null,
          photoOfClinicUrl: uploadedClinicImage?.url ?? null,
          workingHours: dto.workingHours ?? null,
          workdays: dto.workdays ?? [],

          user: {
            create: {
              name: dto.name,
              email: dto.email,
              phone: normalizePhone(dto.phone),
              password: hashedPassword,
              photourl: uploadedProfileImage?.url ?? null,
              role: Role.DOCTOR,
              isActive: false,
              gender: dto.gender,
              SSN: dto.SSN,
              birthdate: new Date(dto.birthdate),
            },
          },
        },
        select: DOCTOR_SELECT,
      });

      return doctor;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `Doctor creation failed for email: ${dto.email}`,
        err.stack,
      );

      await this.rollbackImageUpload(uploadedProfileImage);
      await this.rollbackImageUpload(uploadedLicenseImage);
      await this.rollbackImageUpload(uploadedIdCardImage);
      await this.rollbackImageUpload(uploadedClinicImage);

      this.handleUniqueConstraintError(error);

      throw error;
    }
  }
  async updateDoctor(
    id: number,
    dto: UpdateDoctorDto,
  ): Promise<DoctorWithUser> {
    const doctor = await this.prisma.doctors.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    // Build user-level update data
    const userData: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      isActive?: boolean;
    } = {};
    if (dto.name !== undefined) userData.name = dto.name;
    if (dto.email !== undefined) userData.email = dto.email;
    if (dto.phone !== undefined) userData.phone = normalizePhone(dto.phone);
    if (dto.password !== undefined)
      userData.password = await argon2.hash(dto.password);
    if (dto.isActive !== undefined) userData.isActive = dto.isActive;

    // Build doctor-level update data
    const doctorData: {
      specialty?: string;
      yearsExperience?: number;
      nameOfClinic?: string;
      locationOfClinic?: string;
      workingHours?: string;
      workdays?: string[];
    } = {};
    if (dto.specialty !== undefined) doctorData.specialty = dto.specialty;
    if (dto.yearsExperience !== undefined)
      doctorData.yearsExperience = dto.yearsExperience;
    if (dto.nameOfClinic !== undefined)
      doctorData.nameOfClinic = dto.nameOfClinic;
    if (dto.locationOfClinic !== undefined)
      doctorData.locationOfClinic = dto.locationOfClinic;
    if (dto.workingHours !== undefined)
      doctorData.workingHours = dto.workingHours;
    if (dto.workdays !== undefined) doctorData.workdays = dto.workdays;

    try {
      // Update both atomically in a transaction
      const hasUserUpdate = Object.keys(userData).length > 0;
      const hasDoctorUpdate = Object.keys(doctorData).length > 0;

      if (hasUserUpdate && hasDoctorUpdate) {
        await this.prisma.$transaction([
          this.prisma.users.update({
            where: { id: doctor.userId },
            data: userData,
          }),
          this.prisma.doctors.update({
            where: { id },
            data: doctorData,
          }),
        ]);
      } else if (hasUserUpdate) {
        await this.prisma.users.update({
          where: { id: doctor.userId },
          data: userData,
        });
      } else if (hasDoctorUpdate) {
        await this.prisma.doctors.update({
          where: { id },
          data: doctorData,
        });
      }

      return (await this.prisma.doctors.findUnique({
        where: { id },
        select: DOCTOR_SELECT,
      })) as DoctorWithUser;
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async deleteDoctor(id: number): Promise<ApiResponse> {
    const doctor = await this.prisma.doctors.findUnique({
      where: { id },
      select: {
        userId: true,
        licenseMedicalPhotoUrl: true,
        idCardPhotoUrl: true,
        photoOfClinicUrl: true,
        user: { select: { photourl: true } },
      },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    // Cascade: delete user (which cascades to doctor via FK)
    await this.prisma.users.delete({ where: { id: doctor.userId } });

    this.logger.log(`Doctor deleted – id: ${id}`);

    // Best-effort Cloudinary cleanup (non-blocking)
    const imageUrls = [
      doctor.licenseMedicalPhotoUrl,
      doctor.idCardPhotoUrl,
      doctor.photoOfClinicUrl,
      doctor.user.photourl,
    ].filter(Boolean) as string[];

    for (const url of imageUrls) {
      const publicId = this.cloudinary.extractPublicId(url);
      if (publicId) {
        this.rollbackImageUpload({ publicId, url }).catch(() => {});
      }
    }

    return {
      message: 'Doctor deleted successfully',
      statusCode: 200,
    };
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (!error || typeof error !== 'object') return;
    const maybePrismaError = error as { code?: unknown };
    if (maybePrismaError.code === 'P2002') {
      throw new ConflictException(
        'A doctor with this email, phone, SSN, or license already exists',
      );
    }
  }

  private async rollbackImageUpload(
    image: { publicId: string; url: string } | null,
  ): Promise<void> {
    if (!image) return;
    try {
      await this.cloudinary.deleteFile(image.publicId);
    } catch (rollbackErr: unknown) {
      const err =
        rollbackErr instanceof Error
          ? rollbackErr
          : new Error(String(rollbackErr));
      this.logger.error(
        `Image rollback failed for publicId: ${image.publicId}`,
        err.stack,
      );
    }
  }
}
