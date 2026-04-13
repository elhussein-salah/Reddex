import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDoctorDto } from './dto/create.doctor.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadFolder } from 'src/enums';
import { Prisma } from 'src/generated/prisma/client';

const DOCTOR_SELECT = {
  id: true,
  specialty: true,
  bio: true,
  phone: true,
  SSN: true,
  licenseMedical: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
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
    file?: Express.Multer.File,
  ): Promise<DoctorWithUser> {
    const hashedPassword = await argon2.hash(dto.password);
    let uploadedImage: { publicId: string; url: string } | null = null;

    if (file) {
      uploadedImage = await this.cloudinary.uploadImage(
        file,
        UploadFolder.DOCTOR_PROFILE,
      );
    }

    try {
      return await this.prisma.doctors.create({
        data: {
          specialty: dto.specialty,
          bio: dto.bio,
          SSN: dto.SSN,
          licenseMedical: dto.licenseMedical,
          user: {
            create: {
              name: dto.name,
              email: dto.email,
              phone: dto.phone,
              password: hashedPassword,
              photourl: uploadedImage?.url ?? null,
              role: Role.DOCTOR,
              isActive: true,
            },
          },
        },
        select: DOCTOR_SELECT,
      });
    } catch (error: unknown) {
      await this.rollbackImageUpload(uploadedImage);
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
