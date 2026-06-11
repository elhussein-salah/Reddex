import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { applicationDefault, initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(private readonly prisma: PrismaService) {
    if (getApps().length === 0) {
      try {
        initializeApp({
          credential: applicationDefault(),
        });
        this.logger.log(
          '✅ Firebase Admin initialized successfully using GOOGLE_APPLICATION_CREDENTIALS',
        );
      } catch (error) {
        this.logger.error(
          '❌ Firebase admin initialization failed. Please check GOOGLE_APPLICATION_CREDENTIALS.',
          error,
        );
      }
    } else {
      this.logger.log('✅ Firebase Admin is already initialized');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for pending prescription doses...');

    const now = new Date();
    const pendingDoses = await this.prisma.prescriptionDose.findMany({
      where: {
        status: 'PENDING',
        exactTime: {
          lte: now,
        },
      },
      include: {
        prescription: true,
      },
      take: 100,
    });

    if (pendingDoses.length === 0) return;

    this.logger.debug(`Found ${pendingDoses.length} pending doses to process.`);

    for (const dose of pendingDoses) {
      try {
        const patientId = dose.prescription.patientId;

        const patient = await this.prisma.patients.findUnique({
          where: { id: patientId },
          select: { userId: true },
        });

        if (!patient) continue;

        const deviceTokens = await this.prisma.deviceToken.findMany({
          where: { userId: patient.userId },
        });

        if (deviceTokens.length > 0 && getApps().length > 0) {
          const tokens = deviceTokens.map((dt) => dt.token);

          const message = {
            notification: {
              title: 'Medication Reminder',
              body: `It is time to take ${dose.prescription.medicationName} - ${dose.prescription.instructions || ''}`,
            },
            tokens,
          };

          const response = await getMessaging().sendEachForMulticast(message);

          if (response.failureCount > 0) {
            response.responses.forEach((res, idx) => {
              if (!res.success) {
                const errorCodesToDelete = [
                  'messaging/invalid-registration-token',
                  'messaging/registration-token-not-registered',
                ];
                if (
                  res.error?.code &&
                  errorCodesToDelete.includes(res.error.code)
                ) {
                  this.prisma.deviceToken
                    .delete({
                      where: { token: tokens[idx] },
                    })
                    .catch((e) => this.logger.error(e));
                }
              }
            });
          }
        }

        await this.prisma.prescriptionDose.update({
          where: { id: dose.id },
          data: { status: 'SENT' },
        });
      } catch (error) {
        this.logger.error(`Failed to process dose ${dose.id}`, error);
      }
    }
  }
}
