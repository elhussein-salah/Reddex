import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { ApiResponse } from 'src/common/interfaces/api.response';
import { Prisma } from 'src/generated/prisma/client';
import { ProfileLookupService } from 'src/common/services/profile-lookup.service';

const RESULT_SELECT = {
  id: true,
  patientId: true,
  result: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileLookup: ProfileLookupService,
  ) {}

  async create(dto: CreateResultDto) {
    this.logger.log(`Creating result for patient ID: ${dto.patientId}`);

    const patient = await this.prisma.patients.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${dto.patientId} not found`);
    }

    return this.prisma.result.create({
      data: {
        patientId: dto.patientId,
        result: dto.result as Prisma.InputJsonValue,
      },
      select: RESULT_SELECT,
    });
  }

  async findAll() {
    return this.prisma.result.findMany({
      select: RESULT_SELECT,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const result = await this.prisma.result.findUnique({
      where: { id },
      select: RESULT_SELECT,
    });

    if (!result) {
      throw new NotFoundException(`Result with ID ${id} not found`);
    }

    return result;
  }

  async findMyResults(userId: number) {
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);
    return this.findByPatient(patientId);
  }

  async findByPatient(userId: number) {
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);
    return this.prisma.result.findMany({
      where: { patientId },
      select: RESULT_SELECT,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateResultDto) {
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);
    const existing = await this.prisma.result.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Result with ID ${id} not found`);
    }

    if (existing.patientId !== patientId) {
      throw new NotFoundException(`You are not allowed to update this result`);
    }

    return this.prisma.result.update({
      where: { id },
      data: {
        result: dto.result as Prisma.InputJsonValue,
      },
      select: RESULT_SELECT,
    });
  }

  async remove(id: number): Promise<ApiResponse> {
    const existing = await this.prisma.result.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Result with ID ${id} not found`);
    }

    await this.prisma.result.delete({ where: { id } });

    return {
      message: 'Result deleted successfully',
      statusCode: 200,
    };
  }
}
