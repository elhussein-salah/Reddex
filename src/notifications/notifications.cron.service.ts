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

    // 1. Single query with eager-loaded relations (eliminates N+1)
    const pendingDoses = await this.prisma.prescriptionDose.findMany({
      where: {
        status: 'PENDING',
        exactTime: {
          lte: now,
        },
      },
      include: {
        prescription: {
          include: {
            patient: {
              include: {
                user: {
                  include: {
                    deviceTokens: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 100,
    });

    if (pendingDoses.length === 0) return;

    this.logger.debug(`Found ${pendingDoses.length} pending doses to process.`);

    // 2. Batch-mark all fetched doses as SENT immediately (prevents race conditions)
    const doseIds = pendingDoses.map((dose) => dose.id);
    await this.prisma.prescriptionDose.updateMany({
      where: { id: { in: doseIds } },
      data: { status: 'SENT' },
    });

    // 3. Send notifications and collect stale tokens
    const staleTokens = new Set<string>();

    for (const dose of pendingDoses) {
      try {
        const deviceTokens = dose.prescription.patient?.user?.deviceTokens;

        if (
          !deviceTokens ||
          deviceTokens.length === 0 ||
          getApps().length === 0
        ) {
          continue;
        }

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
                staleTokens.add(tokens[idx]);
              }
            }
          });
        }
      } catch (error) {
        this.logger.error(`Failed to process dose ${dose.id}`, error);
      }
    }

    // 4. Single batch delete for all stale tokens (replaces fire-and-forget deletes)
    if (staleTokens.size > 0) {
      try {
        const { count } = await this.prisma.deviceToken.deleteMany({
          where: { token: { in: [...staleTokens] } },
        });
        this.logger.log(`🗑️ Cleaned up ${count} stale device token(s).`);
      } catch (error) {
        this.logger.error('Failed to delete stale device tokens', error);
      }
    }
  }
}
