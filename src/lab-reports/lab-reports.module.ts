import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { LabReportService } from './lab-reports.service';
import { LabReportController } from './lab-reports.controller';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  providers: [LabReportService],
  controllers: [LabReportController],
})
export class LabReportsModule {}
