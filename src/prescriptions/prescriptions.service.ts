import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowUpStatus, Prisma } from '../generated/prisma/client';
import { Role } from '../enums';
import type { ApiResponse } from '../common/interfaces/api.response';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto, UpdatePrescriptionDto } from './dto';
import { ProfileLookupService } from '../common/services/profile-lookup.service';
import * as dayjs from 'dayjs';
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const PRESCRIPTION_SELECT = {
  id: true,
  followUpId: true,
  doctorId: true,
  patientId: true,
  medicationName: true,
  instructions: true,
  durationInDays: true,
  startDate: true,
  patient: {
    select: {
      treatments: true,
    },
  },
} as const;

const MEDICATION_OVERVIEW_SELECT = {
  id: true,
  medicationName: true,
  instructions: true,
  durationInDays: true,
  startDate: true,
  createdAt: true,
  doctor: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

type PrescriptionRecord = Prisma.PrescriptionGetPayload<{
  select: typeof PRESCRIPTION_SELECT;
}>;

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileLookup: ProfileLookupService,
  ) {}

  async getMyPrescriptions(
    userId: number,
    pagination: {
      skip: number;
      take: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    },
  ): Promise<ApiResponse> {
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where: { patientId },
        select: PRESCRIPTION_SELECT,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.prescription.count({ where: { patientId } }),
    ]);

    return {
      message: 'Prescriptions fetched successfully',
      statusCode: 200,
      data: {
        items: prescriptions,
        meta: {
          total,
          page: Math.floor(pagination.skip / pagination.take) + 1,
          limit: pagination.take,
          totalPages: Math.ceil(total / pagination.take),
        },
      },
    };
  }

  async getMyMedications(userId: number): Promise<ApiResponse> {
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);

    const [patient, prescriptions] = await Promise.all([
      this.prisma.patients.findUnique({
        where: { id: patientId },
        select: {
          treatments: true,
        },
      }),
      this.prisma.prescription.findMany({
        where: { patientId },
        select: MEDICATION_OVERVIEW_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      message: 'Medications fetched successfully',
      statusCode: 200,
      data: {
        treatments: patient?.treatments ?? [],
        prescribed: prescriptions,
        allMedications: [...(patient?.treatments ?? []), ...prescriptions],
      },
    };
  }

  async getPatientPrescriptions(patientId: number): Promise<ApiResponse> {
    await this.ensurePatientExists(patientId);

    const prescriptions = await this.prisma.prescription.findMany({
      where: { patientId },
      select: PRESCRIPTION_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Patient prescriptions fetched successfully',
      statusCode: 200,
      data: prescriptions,
    };
  }

  async createPrescription(
    userId: number,
    dto: CreatePrescriptionDto,
    activeFollowUpId?: number,
  ): Promise<ApiResponse> {
    const doctorId = await this.profileLookup.getDoctorIdByUserId(userId);
    await this.ensurePatientExists(dto.patientId);

    let followUpId = activeFollowUpId;

    if (!followUpId) {
      const followUp = await this.prisma.followUp.findFirst({
        where: {
          doctorId,
          patientId: dto.patientId,
          status: FollowUpStatus.ACCEPTED,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        select: { id: true },
      });

      if (!followUp) {
        throw new ForbiddenException(
          'Prescription can only be created when the patient has an active follow-up with this doctor.',
        );
      }

      followUpId = followUp.id;
    }

    const prescription = await this.prisma.$transaction(async (tx) => {
      const createdPrescription = await tx.prescription.create({
        data: {
          followUpId,
          doctorId,
          patientId: dto.patientId,
          medicationName: dto.medicationName,
          instructions: dto.instructions,
          durationInDays: dto.durationInDays,
          startDate: new Date(dto.startDate),
        },
        select: PRESCRIPTION_SELECT,
      });

      const dosesData = this.calculateDoses(
        createdPrescription.id,
        dto.startDate,
        dto.durationInDays,
        dto.timesPerDay,
        dto.timezone,
      );

      if (dosesData.length > 0) {
        await tx.prescriptionDose.createMany({
          data: dosesData,
        });
      }

      return {
        ...createdPrescription,
        dosesScheduledCount: dosesData.length,
      };
    });

    return {
      message: 'Prescription created and reminders scheduled successfully',
      statusCode: 201,
      data: prescription,
    };
  }

  private async ensurePatientExists(patientId: number): Promise<void> {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }
  }

  async updatePrescription(
    userId: number,
    prescriptionId: number,
    dto: UpdatePrescriptionDto,
  ): Promise<ApiResponse> {
    const doctorId = await this.profileLookup.getDoctorIdByUserId(userId);

    const existing = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!existing) {
      throw new NotFoundException('Prescription not found');
    }

    if (existing.doctorId !== doctorId) {
      throw new ForbiddenException('You are not authorized to update this prescription');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const newPrescription = await tx.prescription.update({
        where: { id: prescriptionId },
        data: {
          instructions: dto.instructions !== undefined ? dto.instructions : existing.instructions,
          durationInDays: dto.durationInDays !== undefined ? dto.durationInDays : existing.durationInDays,
          startDate: dto.startDate !== undefined ? new Date(dto.startDate) : existing.startDate,
          medicationName: dto.medicationName !== undefined ? dto.medicationName : existing.medicationName,
        },
      });

      let dosesScheduledCount = 0;

      if (dto.durationInDays !== undefined || dto.startDate !== undefined || dto.timesPerDay !== undefined || dto.timezone !== undefined) {
        await tx.prescriptionDose.deleteMany({
          where: {
            prescriptionId,
            status: 'PENDING',
          },
        });

        if (dto.timesPerDay && dto.timesPerDay.length > 0) {
          const startDateStr = dto.startDate || newPrescription.startDate.toISOString();
          const dosesData = this.calculateDoses(
            newPrescription.id,
            startDateStr,
            newPrescription.durationInDays,
            dto.timesPerDay,
            dto.timezone,
          );

          if (dosesData.length > 0) {
            await tx.prescriptionDose.createMany({
              data: dosesData,
            });
            dosesScheduledCount = dosesData.length;
          }
        }
      }

      return {
        prescriptionId: newPrescription.id,
        dosesRescheduledCount: dosesScheduledCount,
      };
    });

    return {
      message: 'Prescription updated and future reminders rescheduled',
      statusCode: 200,
      data: updated,
    };
  }

  async deletePrescription(
    id: number,
    userId: number,
    role: string,
  ): Promise<ApiResponse> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    if (role === Role.DOCTOR) {
      const doctorId = await this.profileLookup.getDoctorIdByUserId(userId);
      if (prescription.doctorId !== doctorId) {
        throw new ForbiddenException(
          'You are not authorized to delete this prescription.',
        );
      }
    }

    await this.prisma.prescription.delete({
      where: { id },
    });

    return {
      message: 'Prescription deleted and reminders cancelled successfully',
      statusCode: 200,
    };
  }

  private calculateDoses(
    prescriptionId: number,
    startDateStr: string,
    durationInDays: number,
    timesPerDay: string[],
    tz?: string,
  ) {
    const doses: { prescriptionId: number; exactTime: Date; status: string }[] = [];
    const timezoneId = tz || 'UTC';
    
    const baseDate = (dayjs as any).tz(startDateStr, timezoneId).startOf('day');

    for (let dayOffset = 0; dayOffset < durationInDays; dayOffset++) {
      const currentDay = baseDate.add(dayOffset, 'day');
      
      for (const time of timesPerDay) {
        const [hours, minutes] = time.split(':').map(Number);
        
        const exactTime = currentDay.hour(hours).minute(minutes).second(0).toDate();
        
        if (exactTime > new Date()) {
          doses.push({
            prescriptionId,
            exactTime,
            status: 'PENDING',
          });
        }
      }
    }

    return doses;
  }
}
