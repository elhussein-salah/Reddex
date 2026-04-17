import {
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
import { Prisma } from 'src/generated/prisma/client';
import { normalizePhone } from 'src/common/utils/phone.util';

const PATIENT_SELECT = {
  id: true,
  birthdate: true,
  SSN: true,
  healthStatus: true,
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

type PatientWithUser = Prisma.patientsGetPayload<{
  select: typeof PATIENT_SELECT;
}>;

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createPatient(
    dto: CreatePatientDto,
    file?: Express.Multer.File,
  ): Promise<PatientWithUser> {
    this.logger.log(`Creating patient for email: ${dto.email}`);
    const hashedPassword = await argon2.hash(dto.password);
    let uploadedImage: { publicId: string; url: string } | null = null;

    if (file) {
      uploadedImage = await this.cloudinary.uploadImage(
        file,
        UploadFolder.PATIENT_PROFILE,
      );
    }

    try {
      return await this.prisma.patients.create({
        data: {
          birthdate: new Date(dto.birthdate),
          SSN: dto.SSN,
          healthStatus: dto.healthStatus,
          user: {
            create: {
              name: dto.name,
              email: dto.email,
              phone: normalizePhone(dto.phone),
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
      this.logger.error(`Patient creation failed for email: ${dto.email}`, err.stack);
      await this.rollbackImageUpload(uploadedImage);
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async getPatients(): Promise<PatientWithUser[]> {
    return await this.prisma.patients.findMany({ select: PATIENT_SELECT });
  }

  async getPatient(id: number): Promise<PatientWithUser> {
    const patient = await this.prisma.patients.findUnique({
      where: { id },
      select: PATIENT_SELECT,
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async updatePatient(
    id: number,
    dto: Partial<CreatePatientDto>,
  ): Promise<PatientWithUser> {
    const existingPatient = await this.prisma.patients.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingPatient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    const patientData: {
      birthdate?: Date;
      SSN?: string;
      healthStatus?: string;
    } = {};

    if (dto.birthdate !== undefined) {
      patientData.birthdate = new Date(dto.birthdate);
    }
    if (dto.SSN !== undefined) patientData.SSN = dto.SSN;
    if (dto.healthStatus !== undefined)
      patientData.healthStatus = dto.healthStatus;

    const userData: {
      name?: string;
      email?: string;
      password?: string;
    } = {};

    if (dto.name !== undefined) userData.name = dto.name;
    if (dto.email !== undefined) userData.email = dto.email;
    if (dto.password !== undefined) {
      userData.password = await argon2.hash(dto.password);
    }

    try {
      if (Object.keys(userData).length === 0) {
        return await this.prisma.patients.update({
          where: { id },
          data: patientData,
          select: PATIENT_SELECT,
        });
      }

      const [, updatedPatient] = await this.prisma.$transaction([
        this.prisma.users.update({
          where: { id: existingPatient.userId },
          data: userData,
        }),
        this.prisma.patients.update({
          where: { id },
          data: patientData,
          select: PATIENT_SELECT,
        }),
      ]);

      return updatedPatient;
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async deletePatient(id: number): Promise<ApiResponse> {
    this.logger.log(`Deleting patient id: ${id}`);
    const patient = await this.prisma.patients.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.patients.delete({ where: { id } }),
      this.prisma.users.delete({ where: { id: patient.userId } }),
    ]);

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
      const err = rollbackErr instanceof Error ? rollbackErr : new Error(String(rollbackErr));
      this.logger.error(`Image rollback failed`, err.stack);
    }
  }
}
