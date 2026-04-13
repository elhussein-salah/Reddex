import { Module } from '@nestjs/common';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [FollowUpController],
  providers: [FollowUpService, PrismaService],
})
export class FollowUpModule {}
