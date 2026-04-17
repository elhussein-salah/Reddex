import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabReportDto, LabResultDto } from './dto/create-lab-report.dto';
import { UpdateLabReportDto } from './dto/update-lab-report.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Role, UploadFolder } from 'src/enums';

@Injectable()
export class LabReportService {
  private readonly logger = new Logger(LabReportService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  private async getPatientIdForUser(userId: number): Promise<number | null> {
    const patient = await this.prisma.patients.findUnique({
      where: { userId: userId },
      select: { id: true },
    });
    return patient?.id ?? null;
  }

  private async assertLabReportAccessByPatientId(
    user: { sub: number; role: Role },
    reportPatientId: number,
  ): Promise<void> {
    if (user.role === Role.PATIENT) {
      const patientId = await this.getPatientIdForUser(user.sub);
      if (!patientId || patientId !== reportPatientId) {
        throw new ForbiddenException(
          'You are not authorized to access this lab report',
        );
      }
    } else if (user.role !== Role.DOCTOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to access this lab report',
      );
    }
  }

  async create(
    dto: CreateLabReportDto,
    user: { sub: number; role: Role },
    file?: Express.Multer.File,
  ) {
    this.logger.log(`Creating lab report for patientId: ${dto.patient_id} by userId: ${user.sub}`);
    if (user.role === Role.PATIENT) {
      const patientId = await this.getPatientIdForUser(user.sub);
      if (!patientId || patientId !== dto.patient_id) {
        throw new ForbiddenException(
          'Patients may only create lab reports for their own account',
        );
      }
    } else if (user.role !== Role.DOCTOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to create a lab report',
      );
    }
    if (file) {
      const uploadedFile = await this.cloudinary.uploadImage(
        file,
        UploadFolder.LAB_REPORTS,
        dto.patient_id.toString(),
      );
      dto.photo = uploadedFile.url;
    }
    const parsedResults =
      typeof (dto.results as unknown) === 'string'
        ? (JSON.parse(dto.results as unknown as string) as LabResultDto[])
        : dto.results;
    return this.prisma.labReport.create({
      data: {
        patient_id: dto.patient_id,
        photo: dto.photo as string,
        results: {
          create: parsedResults,
        },
      },
      include: {
        results: true,
      },
    });
  }

  async findAll(user: { sub: number; role: Role }) {
    if (user.role === Role.PATIENT) {
      const patientId = await this.getPatientIdForUser(user.sub);
      if (!patientId) {
        throw new ForbiddenException('Patient profile not found');
      }
      return this.prisma.labReport.findMany({
        where: { patient_id: patientId },
        include: {
          results: true,
          patient: true,
        },
      });
    }
    if (user.role !== Role.DOCTOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to list lab reports',
      );
    }
    return this.prisma.labReport.findMany({
      include: {
        results: true,
        patient: true,
      },
    });
  }

  async findAllByPatientId(
    patientId: number,
    user: { sub: number; role: Role },
  ) {
    if (user.role !== Role.DOCTOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to list reports for this patient',
      );
    }

    return this.prisma.labReport.findMany({
      where: { patient_id: patientId },
      include: {
        results: true,
        patient: true,
      },
    });
  }
  async findOne(id: number, user: { sub: number; role: Role }) {
    this.logger.log(`Fetching lab report id: ${id} by userId: ${user.sub}`);
    const report = await this.prisma.labReport.findUnique({
      where: { id },
      include: {
        results: true,
      },
    });
    if (!report) {
      throw new NotFoundException(`Lab report with ID ${id} not found`);
    }
    await this.assertLabReportAccessByPatientId(user, report.patient_id);
    return report;
  }

  async update(
    id: number,
    dto: UpdateLabReportDto,
    user: { sub: number; role: Role },
    file?: Express.Multer.File,
  ) {
    this.logger.log(`Updating lab report id: ${id} by userId: ${user.sub}`);
    const existing = await this.prisma.labReport.findUnique({
      where: { id },
      select: { patient_id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Lab report with ID ${id} not found`);
    }
    await this.assertLabReportAccessByPatientId(user, existing.patient_id);

    if (file) {
      const uploadedFile = await this.cloudinary.uploadImage(
        file,
        UploadFolder.LAB_REPORTS,
        id.toString(),
      );
      dto.photo = uploadedFile.url;
    }

    return this.prisma.labReport.update({
      where: { id },
      data: {
        photo: dto.photo as string,
        // ⚠️ naive update (replace all results)
        results: dto.results
          ? {
              deleteMany: {},
              create: dto.results,
            }
          : undefined,
      },
      include: {
        results: true,
      },
    });
  }

  async remove(id: number, user: { sub: number; role: Role }) {
    this.logger.log(`Deleting lab report id: ${id} by userId: ${user.sub}`);
    const existing = await this.prisma.labReport.findUnique({
      where: { id },
      select: { patient_id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Lab report with ID ${id} not found`);
    }
    await this.assertLabReportAccessByPatientId(user, existing.patient_id);

    const result = this.prisma.labReport.delete({
      where: { id },
    });
    this.logger.log(`Lab report deleted – id: ${id}`);
    return result;
  }
}
