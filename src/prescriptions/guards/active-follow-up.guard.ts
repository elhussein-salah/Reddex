import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FollowUpLifecycleStatus,
  FollowUpStatus,
} from '../../generated/prisma/client';
import { Role } from '../../enums';
import type { AuthenticatedRequest } from '../../common/interfaces/AuthenticatedRequest';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActiveFollowUpGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { body?: { patientId?: unknown } }>();

    if (!request.user) {
      throw new ForbiddenException('No user found in request');
    }

    if (request.user.role !== Role.DOCTOR) {
      throw new ForbiddenException('Only doctors can create prescriptions');
    }

    const rawPatientId = request.body?.patientId;
    const patientId =
      typeof rawPatientId === 'number'
        ? rawPatientId
        : Number(rawPatientId ?? NaN);

    // Let DTO validation surface shape/type issues consistently.
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return true;
    }

    const doctor = await this.prisma.doctors.findUnique({
      where: { userId: request.user.sub },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found.');
    }

    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    const followUp = await this.prisma.followUp.findFirst({
      where: {
        doctorId: doctor.id,
        patientId,
        status: FollowUpStatus.ACCEPTED,
        lifecycleStatus: FollowUpLifecycleStatus.ACTIVE,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      select: { id: true },
    });

    if (!followUp) {
      throw new ForbiddenException(
        'Prescription can only be created when the patient has an active follow-up with this doctor.',
      );
    }

    // Attach the follow-up ID so the service can reuse it
    // without running the same query again.
    (request as any).activeFollowUpId = followUp.id;

    return true;
  }
}
