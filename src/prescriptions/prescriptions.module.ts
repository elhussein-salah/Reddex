import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileLookupModule } from '../common/services/profile-lookup.module';
import { ActiveFollowUpGuard } from './guards/active-follow-up.guard';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [PrismaModule, ProfileLookupModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, ActiveFollowUpGuard],
})
export class PrescriptionsModule {}
