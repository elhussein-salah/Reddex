import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowUpStatus, Prisma } from '../generated/prisma/client';
import type { ApiResponse } from '../common/interfaces/api.response';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto';
import { ProfileLookupService } from '../common/services/profile-lookup.service';

const PRESCRIPTION_SELECT = {
  id: true,
  followUpId: true,
  doctorId: true,
  patientId: true,
  medicationName: true,
  duration: true,
  patient: {
    select: {
      treatments: true,
    },
  },
} as const;

const MEDICATION_OVERVIEW_SELECT = {
  id: true,
  medicationName: true,
  duration: true,
  issuedAt: true,
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
        orderBy: { issuedAt: 'desc' },
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

    // Reuse the follow-up ID from the guard if available;
    // otherwise fall back to querying (defensive, for non-guard callers).
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

    const prescription = await this.prisma.prescription.create({
      data: {
        followUpId,
        doctorId,
        patientId: dto.patientId,
        medicationName: dto.medicationName,
        duration: dto.duration,
      },
      select: PRESCRIPTION_SELECT,
    });

    return this.toCreateResponse(prescription);
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

  private toCreateResponse(data: PrescriptionRecord): ApiResponse {
    return {
      message: 'Prescription created successfully',
      statusCode: 201,
      data,
    };
  }
}
