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
import { FollowUpStatus } from '../generated/prisma/client';

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

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
    this.logger.log(
      `Follow-up request from userId: ${userId} to doctorId: ${dto.doctorId}`,
    );
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
        notes: dto.notes,
        status: FollowUpStatus.PENDING,
      },
    });
    this.logger.log(`Follow-up created – id: ${followUp.id}`);
    return followUp;
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
    this.logger.log(
      `Doctor userId: ${userId} responding to followUpId: ${followUpId} with status: ${status}`,
    );
    const doctorId = await this.getDoctorIdByUserId(userId);
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
      data: { status },
    });
    this.logger.log(`Follow-up ${followUpId} updated to: ${status}`);
    return updated;
  }

  async cancelRequest(userId: number, followUpId: number) {
    this.logger.log(
      `Patient userId: ${userId} cancelling followUpId: ${followUpId}`,
    );
    const patientId = await this.getPatientIdByUserId(userId);
    const followUp = await this.prisma.followUp.findUnique({
      where: { id: followUpId },
    });

    if (!followUp) throw new NotFoundException('Follow-up request not found.');

    // Security check: Make sure this request belongs to this exact patient
    if (followUp.patientId !== patientId) {
      this.logger.warn(
        `Forbidden: patientId ${patientId} tried to cancel followUpId: ${followUpId}`,
      );
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

    const updated = await this.prisma.followUp.update({
      where: { id: followUpId },
      data: { status: FollowUpStatus.CANCELLED },
    });
    this.logger.log(`Follow-up ${followUpId} cancelled`);
    return updated;
  }
}
