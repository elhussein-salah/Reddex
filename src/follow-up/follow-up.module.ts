import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileLookupModule } from '../common/services/profile-lookup.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';

@Module({
  imports: [PrismaModule, ProfileLookupModule, NotificationsModule],
  controllers: [FollowUpController],
  providers: [FollowUpService],
})
export class FollowUpModule {}
