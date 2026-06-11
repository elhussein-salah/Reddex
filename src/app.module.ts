import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DoctorModule } from './doctor/doctor.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { FollowUpModule } from './follow-up/follow-up.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { RequestIdMiddleware, HttpLoggerMiddleware } from './common/middleware';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { validateEnv } from './common/config/env.validation';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { LabsModule } from './labs/labs.module';
import { ResultsModule } from './results/results.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),
    PrismaModule,
    AdminAuthModule,
    AuthModule,
    FollowUpModule,
    UserModule,
    DoctorModule,
    CloudinaryModule,
    PatientsModule,
    PrescriptionsModule,
    LabsModule,
    ResultsModule,
    NotificationsModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, HttpLoggerMiddleware).forRoutes('*');
  }
}
