import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Shared helpers for resolving the internal doctor/patient ID
 * from a user-level `userId` (the JWT `sub` claim).
 *
 * Extracted here so every feature module can reuse the same
 * lookup logic instead of copy-pasting private methods.
 */
@Injectable()
export class ProfileLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async getPatientIdByUserId(userId: number): Promise<number> {
    const patient = await this.prisma.patients.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    return patient.id;
  }

  async getDoctorIdByUserId(userId: number): Promise<number> {
    const doctor = await this.prisma.doctors.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found.');
    }

    return doctor.id;
  }
}
