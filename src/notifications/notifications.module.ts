import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsCronService } from './notifications.cron.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, NotificationsCronService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
