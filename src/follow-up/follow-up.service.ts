import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto';
import { FollowUpStatus } from '../generated/prisma/client';

@Injectable()
export class FollowUpService {
  constructor(private prisma: PrismaService) {}

  // Helper method to retrieve the internal patient ID
  private async getPatientIdByUserId(userId: number): Promise<number> {
    const patient = await this.prisma.patients.findUnique({
      where: { userId },
    });
    if (!patient) throw new NotFoundException('Patient profile not found.');
    return patient.id;
  }

  // Helper method to retrieve the internal doctor ID
  private async getDoctorIdByUserId(userId: number): Promise<number> {
    const doctor = await this.prisma.doctors.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');
    return doctor.id;
  }

  async createRequest(userId: number, dto: CreateFollowUpDto) {
    const patientId = await this.getPatientIdByUserId(userId);

    // Prevent multiple PENDING requests for the same doctor
    const existingPending = await this.prisma.followUp.findFirst({
      where: {
        patientId,
        doctorId: dto.doctorId,
        status: FollowUpStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'You already have an active pending request for this doctor.',
      );
    }

    return this.prisma.followUp.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        notes: dto.notes,
        status: FollowUpStatus.PENDING,
      },
    });
  }

  async getDoctorPendingRequests(userId: number) {
    const doctorId = await this.getDoctorIdByUserId(userId);

    return this.prisma.followUp.findMany({
      where: {
        doctorId,
        status: FollowUpStatus.PENDING,
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
    });
  }

  async respondToRequest(
    userId: number,
    followUpId: number,
    status: FollowUpStatus,
  ) {
    const doctorId = await this.getDoctorIdByUserId(userId);
    const followUp = await this.prisma.followUp.findUnique({
      where: { id: followUpId },
    });

    if (!followUp) throw new NotFoundException('Follow-up request not found.');

    // Security check: Make sure this request belongs to this exact doctor
    if (followUp.doctorId !== doctorId) {
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

    return this.prisma.followUp.update({
      where: { id: followUpId },
      data: { status },
    });
  }

  async cancelRequest(userId: number, followUpId: number) {
    const patientId = await this.getPatientIdByUserId(userId);
    const followUp = await this.prisma.followUp.findUnique({
      where: { id: followUpId },
    });

    if (!followUp) throw new NotFoundException('Follow-up request not found.');

    // Security check: Make sure this request belongs to this exact patient
    if (followUp.patientId !== patientId) {
      throw new ForbiddenException(
        'You are not authorized to cancel this request.',
      );
    }

    // Constraint: Can only cancel PENDING requests
    if (followUp.status !== FollowUpStatus.PENDING) {
      throw new BadRequestException(
        'Request is no longer pending and cannot be cancelled.',
      );
    }

    return this.prisma.followUp.update({
      where: { id: followUpId },
      data: { status: FollowUpStatus.CANCELLED },
    });
  }
}
