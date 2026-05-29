import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from 'src/generated/prisma/enums';
import { ApiResponse } from 'src/common/interfaces/api.response';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create.patient.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadFolder } from 'src/enums';
import { normalizePhone } from 'src/common/utils/phone.util';
import { UpdatePatientDto } from './dto/update.patient.dto';

const PATIENT_SELECT = {
  id: true,
  healthStatus: true,
  diseases: true,
  treatments: true,
  bloodType: true,
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
      birthdate: true,
      SSN: true,
      gender: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createPatient(dto: CreatePatientDto, file?: Express.Multer.File) {
    this.logger.log(`Creating patient for email: ${dto.email}`);
    const hashedPassword = await argon2.hash(dto.password);
    let uploadedImage: { publicId: string; url: string } | null = null;
    this.logger.log({
      size: file?.size,
      mimetype: file?.mimetype,
      hasBuffer: !!file?.buffer,
    });
    if (file) {
      try {
        uploadedImage = await this.cloudinary.uploadImage(
          file,
          UploadFolder.PATIENT_PROFILE,
        );
      } catch (uploadErr) {
        // Profile photo is optional — don't block registration if Cloudinary is down/slow
        const err =
          uploadErr instanceof Error ? uploadErr : new Error(String(uploadErr));
        this.logger.warn(
          `Profile image upload failed for ${dto.email}, proceeding without photo: ${err.message}`,
        );
      }
    }

    try {
      return await this.prisma.patients.create({
        data: {
          healthStatus: dto.healthStatus,
          bloodType: dto.bloodType,
          diseases: dto.diseases ?? [],
          treatments: dto.treatments ?? [],
          user: {
            create: {
              name: dto.name,
              email: dto.email,
              phone: normalizePhone(dto.phone),
              birthdate: new Date(dto.birthdate),
              SSN: dto.SSN,
              gender: dto.gender,
              isActive: true,
              password: hashedPassword,
              photourl: uploadedImage?.url ?? null,
              role: Role.PATIENT,
            },
          },
        },
        select: PATIENT_SELECT,
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Patient creation failed for email: ${dto.email}`,
        err.stack,
      );
      await this.rollbackImageUpload(uploadedImage);
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async getPatients(pagination: {
    skip: number;
    take: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const [data, total] = await Promise.all([
      this.prisma.patients.findMany({
        select: PATIENT_SELECT,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      this.prisma.patients.count(),
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

  async getPatient(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        patients: {
          select: PATIENT_SELECT,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  // async updatePatient(id: number, dto: UpdatePatientDto) {
  //   const existingUser = await this.prisma.users.findUnique({
  //     where: { id },
  //     select: {
  //       id: true,
  //       patients: { select: { id: true } },
  //     },
  //   });

  //   if (!existingUser || !existingUser.patients) {
  //     throw new NotFoundException(`Patient with ID ${id} not found`);
  //   }

  //   const userData: Record<string, any> = {};
  //   const patientData: Record<string, any> = {};

  //   if (dto.birthdate !== undefined)
  //     userData.birthdate = new Date(dto.birthdate);
  //   if (dto.gender !== undefined) userData.gender = dto.gender;
  //   if (dto.SSN !== undefined) userData.SSN = dto.SSN;
  //   if (dto.name !== undefined) userData.name = dto.name;
  //   if (dto.email !== undefined) userData.email = dto.email;
  //   if (dto.phone !== undefined) userData.phone = normalizePhone(dto.phone);

  //   if (dto.healthStatus !== undefined)
  //     patientData.healthStatus = dto.healthStatus;
  //   if (dto.bloodType !== undefined) patientData.bloodType = dto.bloodType;
  //   if (dto.diseases !== undefined) patientData.diseases = dto.diseases;

  //   try {
  //     await this.prisma.users.update({
  //       where: { id },
  //       data: {
  //         ...userData,
  //         patients: {
  //           update: patientData,
  //         },
  //       },
  //       select: {
  //         id: true,
  //         patients: { select: PATIENT_SELECT },
  //       },
  //     });
  //   } catch (error: unknown) {
  //     this.handleUniqueConstraintError(error);
  //     throw error;
  //   }
  // }
  async updatePatient(
    id: number,
    dto: UpdatePatientDto,
    file?: Express.Multer.File,
  ) {
    const existingUser = await this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        photourl: true,
        patients: {
          select: { id: true },
        },
      },
    });

    if (!existingUser || !existingUser.patients) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    const userData: Record<string, any> = {};
    const patientData: Record<string, any> = {};

    // Handle Profile Picture
    if (file) {
      try {
        const uploadedImage = await this.cloudinary.uploadImage(
          file,
          UploadFolder.PATIENT_PROFILE,
        );
        userData.photourl = uploadedImage.url;

        // Cleanup old image if it exists
        if (existingUser.photourl) {
          const publicId = this.cloudinary.extractPublicId(
            existingUser.photourl,
          );
          if (publicId) {
            await this.cloudinary.deleteFile(publicId);
          }
        }
      } catch (uploadErr) {
        const err =
          uploadErr instanceof Error ? uploadErr : new Error(String(uploadErr));
        this.logger.error(
          `Profile image update failed for user ${id}`,
          err.stack,
        );
        // We decide if we want to fail the whole update or just proceed.
        // For updates, it's safer to fail if the user explicitly tried to change the photo.
        throw new BadRequestException('Failed to upload profile picture');
      }
    }

    // User fields
    if (dto.birthdate !== undefined) {
      userData.birthdate = new Date(dto.birthdate);
    }

    if (dto.gender !== undefined) {
      userData.gender = dto.gender;
    }

    if (dto.SSN !== undefined) {
      userData.SSN = dto.SSN;
    }

    if (dto.name !== undefined) {
      userData.name = dto.name;
    }

    if (dto.email !== undefined) {
      userData.email = dto.email;
    }

    if (dto.phone !== undefined) {
      userData.phone = normalizePhone(dto.phone);
    }

    // Patient fields
    if (dto.healthStatus !== undefined) {
      patientData.healthStatus = dto.healthStatus;
    }

    if (dto.bloodType !== undefined) {
      patientData.bloodType = dto.bloodType;
    }

    if (dto.diseases !== undefined) {
      patientData.diseases = dto.diseases;
    }

    if (dto.treatments !== undefined) {
      patientData.treatments = dto.treatments;
    }
    //update password if provided
    if (dto.password !== undefined) {
      userData.password = await argon2.hash(dto.password);
    }
    try {
      await this.prisma.users.update({
        where: { id },
        data: {
          ...userData,
          patients: {
            update: patientData,
          },
        },
      });

      return {
        message: 'Patient updated successfully',
      };
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }
  async deletePatient(id: number): Promise<ApiResponse> {
    this.logger.log(`Deleting patient id: ${id}`);
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: { patients: { select: { id: true } } },
    });

    if (!user || !user.patients) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    await this.prisma.patients.delete({ where: { id: user.patients.id } });

    this.logger.log(`Patient deleted successfully – id: ${id}`);

    return {
      message: 'Patient deleted successfully',
      statusCode: 200,
    };
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (this.isUniqueConstraintError(error)) {
      throw new ConflictException(
        'A patient with this email or SSN already exists',
      );
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const maybePrismaError = error as { code?: unknown };
    return maybePrismaError.code === 'P2002';
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
      this.logger.error(`Image rollback failed`, err.stack);
    }
  }
}
