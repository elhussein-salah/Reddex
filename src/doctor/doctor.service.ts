import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDoctorDto } from './dto/create.doctor.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadFolder } from 'src/enums';
import { Prisma } from 'src/generated/prisma/client';
import { normalizePhone } from 'src/common/utils/phone.util';

const DOCTOR_SELECT = {
  id: true,
  specialty: true,
  SSN: true,
  licenseMedicalNumber: true,
  licenseMedicalPhotoUrl: true,
  yearsExperience: true,
  idCardPhotoUrl: true,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createDoctor(
    dto: CreateDoctorDto,
    files?: {
      profilePicture?: Express.Multer.File[];
      licenseMedicalPhotoUrl?: Express.Multer.File[];
      idCardPhotoUrl?: Express.Multer.File[];
    },
  ): Promise<DoctorWithUser> {
    const hashedPassword = await argon2.hash(dto.password);

    let uploadedProfileImage: { publicId: string; url: string } | null = null;
    let uploadedLicenseImage: { publicId: string; url: string } | null = null;
    let uploadedIdCardImage: { publicId: string; url: string } | null = null;

    try {
      if (files?.profilePicture?.[0]) {
        uploadedProfileImage = await this.cloudinary.uploadImage(
          files.profilePicture[0],
          UploadFolder.DOCTOR_PROFILE,
        );
      }

      if (files?.licenseMedicalPhotoUrl?.[0]) {
        uploadedLicenseImage = await this.cloudinary.uploadImage(
          files.licenseMedicalPhotoUrl[0],
          UploadFolder.DOCTOR_LICENSE,
        );
      }

      if (files?.idCardPhotoUrl?.[0]) {
        uploadedIdCardImage = await this.cloudinary.uploadImage(
          files.idCardPhotoUrl[0],
          UploadFolder.DOCTOR_DOCTOR,
        );
      }

      return await this.prisma.doctors.create({
        data: {
          specialty: dto.specialty,
          SSN: dto.SSN,
          licenseMedicalNumber: dto.licenseMedicalNumber,
          licenseMedicalPhotoUrl: uploadedLicenseImage?.url ?? '',
          yearsExperience: Number(dto.yearsExperience),
          idCardPhotoUrl: uploadedIdCardImage?.url ?? '',
          user: {
            create: {
              name: dto.name,
              email: dto.email,
              phone: normalizePhone(dto.phone),
              password: hashedPassword,
              photourl: uploadedProfileImage?.url ?? null,
              role: Role.DOCTOR,
              isActive: true,
            },
          },
        },
        select: DOCTOR_SELECT,
      });
    } catch (error: unknown) {
      await this.rollbackImageUpload(uploadedProfileImage);
      await this.rollbackImageUpload(uploadedLicenseImage);
      await this.rollbackImageUpload(uploadedIdCardImage);
      this.handleUniqueConstraintError(error);
      throw error;
    }
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
    } catch {
      // Ignore rollback errors so the original failure is preserved.
    }
  }
}
