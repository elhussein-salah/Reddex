import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DoctorModule } from './doctor/doctor.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { LabReportsModule } from './lab-reports/lab-reports.module';
import { FollowUpModule } from './follow-up/follow-up.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RequestIdMiddleware, HttpLoggerMiddleware } from './common/middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),
    PrismaModule,
    AuthModule,
    FollowUpModule,
    UserModule,
    DoctorModule,
    CloudinaryModule,
    PatientsModule,
    LabReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, HttpLoggerMiddleware).forRoutes('*');
  }
}
