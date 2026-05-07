import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpCleanupService } from './otp-cleanup.service';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PatientsModule } from 'src/patients/patients.module';
import { DoctorModule } from 'src/doctor/doctor.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    UserModule,
    PatientsModule,
    DoctorModule,
    MailModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '168h',
          issuer: 'reddex-api',
          audience: 'reddex-client',
        },
        verifyOptions: {
          issuer: 'reddex-api',
          audience: 'reddex-client',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpCleanupService],
})
export class AuthModule {}
