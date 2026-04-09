import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AuthGuard } from 'src/auth/auth.guard';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [UserController],
  providers: [UserService, AuthGuard],
  exports: [UserService],
})
export class UserModule {}
