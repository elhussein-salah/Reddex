import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProfileLookupService } from './profile-lookup.service';

/**
 * Provides shared profile-lookup helpers that map userId → doctorId / patientId.
 * Import this module wherever you need those helpers.
 */
@Module({
  imports: [PrismaModule],
  providers: [ProfileLookupService],
  exports: [ProfileLookupService],
})
export class ProfileLookupModule {}
