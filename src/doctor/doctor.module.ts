import { Module } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { DoctorController } from './doctor.controller';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  providers: [DoctorService],
  controllers: [DoctorController],
  exports: [DoctorService],
})
export class DoctorModule {}
