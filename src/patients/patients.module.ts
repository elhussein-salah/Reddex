import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AuthGuard } from 'src/auth/auth.guard';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  providers: [PatientsService, AuthGuard],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
