import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto';
import { FollowUpStatus, Prisma } from '../generated/prisma/client';
import { ProfileLookupService } from '../common/services/profile-lookup.service';

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    private prisma: PrismaService,
    private readonly profileLookup: ProfileLookupService,
  ) {}

  async createRequest(userId: number, dto: CreateFollowUpDto) {
    this.logger.log(
      `Follow-up request from userId: ${userId} to doctorId: ${dto.doctorId}`,
    );
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);

    // Prevent multiple PENDING requests for the same doctor
    const existingPending = await this.prisma.followUp.findFirst({
      where: {
        patientId,
        doctorId: dto.doctorId,
        status: FollowUpStatus.PENDING,
      },
    });

    if (existingPending) {
      this.logger.warn(
        `Duplicate pending follow-up – patientId: ${patientId}, doctorId: ${dto.doctorId}`,
      );
      throw new ConflictException(
        'You already have an active pending request for this doctor.',
      );
    }

    const followUp = await this.prisma.followUp.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        status: FollowUpStatus.PENDING,
        endDate: null,
      },
    });
    this.logger.log(`Follow-up created – id: ${followUp.id}`);
    return followUp;
  }

  async getDoctorPendingRequests(
    userId: number,
    pagination: {
      skip: number;
      take: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    },
  ) {
    const doctorId = await this.profileLookup.getDoctorIdByUserId(userId);

    const where = {
      doctorId,
      status: FollowUpStatus.PENDING,
    };

    const [data, total] = await Promise.all([
      this.prisma.followUp.findMany({
        where,
        include: {
          patient: {
            include: {
              user: { select: { name: true, email: true, phone: true } },
            },
          },
        },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      this.prisma.followUp.count({ where }),
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

  async getDoctorPatients(userId: number) {
    const doctorId = await this.profileLookup.getDoctorIdByUserId(userId);

    const where = {
      followUps: {
        some: {
          doctorId,
          status: FollowUpStatus.ACCEPTED,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      },
    };

    const data = await this.prisma.patients.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gender: true,
            photourl: true,
          },
        },
      },
    });

    return {
      data,
    };
  }

  async getPatientDoctors(userId: number) {
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);

    const where = {
      followUps: {
        some: {
          patientId,
          status: FollowUpStatus.ACCEPTED,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      },
    };

    const data = await this.prisma.doctors.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gender: true,
            photourl: true,
          },
        },
      },
    });

    return {
      data,
    };
  }

  async getDoctorsWithFollowUpStatus(
    userId: number,
    filter?: { search?: string },
  ) {
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);

    const where: Prisma.doctorsWhereInput = {
      user: {
        is: {
          isActive: true,
        },
      },
    };

    if (filter?.search) {
      const isCondition = where.user!.is as Prisma.usersWhereInput;
      isCondition.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Fetch all active doctors with their user info
    const doctors = await this.prisma.doctors.findMany({
      where,
      select: {
        id: true,
        specialty: true,
        nameOfClinic: true,
        locationOfClinic: true,
        workingHours: true,
        workdays: true,
        yearsExperience: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gender: true,
            photourl: true,
          },
        },
      },
    });

    // Fetch all follow-ups for this patient (ordered by newest first)
    const followUps = await this.prisma.followUp.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        doctorId: true,
        status: true,
        endDate: true,
      },
    });

    // Group follow-ups by doctorId (first entry = latest)
    const latestFollowUpByDoctor = new Map<
      number,
      { status: FollowUpStatus; endDate: Date | null }
    >();
    for (const fu of followUps) {
      if (!latestFollowUpByDoctor.has(fu.doctorId)) {
        latestFollowUpByDoctor.set(fu.doctorId, {
          status: fu.status,
          endDate: fu.endDate,
        });
      }
    }

    const now = new Date();

    const data = doctors.map((doctor) => {
      const latest = latestFollowUpByDoctor.get(doctor.id);
      let followUpStatus: string;

      if (!latest) {
        followUpStatus = 'NOT_FOLLOWED';
      } else if (latest.status === FollowUpStatus.PENDING) {
        followUpStatus = 'PENDING';
      } else if (latest.status === FollowUpStatus.ACCEPTED) {
        // Check if still active
        const isActive = !latest.endDate || latest.endDate > now;
        followUpStatus = isActive ? 'ACCEPTED' : 'CAN_RESEND';
      } else if (latest.status === FollowUpStatus.REJECTED) {
        followUpStatus = 'REJECTED';
      } else {
        // CANCELLED
        followUpStatus = 'CAN_RESEND';
      }

      return {
        ...doctor,
        followUpStatus,
      };
    });

    return { data };
  }

  async respondToRequest(
    userId: number,
    followUpId: number,
    status: FollowUpStatus,
  ) {
    this.logger.log(
      `Doctor userId: ${userId} responding to followUpId: ${followUpId} with status: ${status}`,
    );
    const doctorId = await this.profileLookup.getDoctorIdByUserId(userId);
    const followUp = await this.prisma.followUp.findUnique({
      where: { id: followUpId },
    });

    if (!followUp) throw new NotFoundException('Follow-up request not found.');

    // Security check: Make sure this request belongs to this exact doctor
    if (followUp.doctorId !== doctorId) {
      this.logger.warn(
        `Forbidden: doctorId ${doctorId} tried to respond to followUpId: ${followUpId}`,
      );
      throw new ForbiddenException(
        'You are not authorized to respond to this request.',
      );
    }

    // Constraint: Can only respond to PENDING requests
    if (followUp.status !== FollowUpStatus.PENDING) {
      throw new BadRequestException(
        'Request is no longer pending and cannot be modified.',
      );
    }

    const updated = await this.prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status,
        endDate: status === FollowUpStatus.ACCEPTED ? null : new Date(),
      },
    });
    this.logger.log(`Follow-up ${followUpId} updated to: ${status}`);
    return updated;
  }

  async cancelRequest(userId: number, doctorId: number) {
    this.logger.log(
      `Patient userId: ${userId} cancelling follow-up with doctorId: ${doctorId}`,
    );
    const patientId = await this.profileLookup.getPatientIdByUserId(userId);

    const followUp = await this.prisma.followUp.findFirst({
      where: {
        patientId,
        doctorId,
        status: FollowUpStatus.PENDING,
      },
    });

    if (!followUp) {
      throw new NotFoundException(
        'No pending follow-up request found for this doctor.',
      );
    }

    const updated = await this.prisma.followUp.update({
      where: { id: followUp.id },
      data: {
        status: FollowUpStatus.CANCELLED,
        endDate: new Date(),
      },
    });
    this.logger.log(`Follow-up ${followUp.id} cancelled`);
    return updated;
  }
}
