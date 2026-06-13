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
    const now = new Date();

    // ── Cron Start ────────────────────────────────────────────────────────────
    this.logger.debug(
      [
        'Cron execution started',
        `UTC:   ${now.toISOString()}`,
        `Local: ${now.toString()}`,
      ].join('\n'),
    );

    // ── Database Query ────────────────────────────────────────────────────────
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

    this.logger.debug(
      `Found ${pendingDoses.length} pending dose(s) to process`,
    );

    if (pendingDoses.length === 0) return;

    // ── Summary Counters ──────────────────────────────────────────────────────
    let notificationsAttempted = 0;
    let notificationsSucceeded = 0;
    let notificationsFailed = 0;

    // 2. Batch-mark all fetched doses as SENT immediately (prevents race conditions)
    const doseIds = pendingDoses.map((dose) => dose.id);
    await this.prisma.prescriptionDose.updateMany({
      where: { id: { in: doseIds } },
      data: { status: 'SENT' },
    });

    // 3. Send notifications and collect stale tokens
    const staleTokens = new Set<string>();

    for (const dose of pendingDoses) {
      // ── Per-Dose Start ──────────────────────────────────────────────────────
      this.logger.debug(
        [
          `Processing dose ${dose.id}`,
          `Prescription: ${dose.prescription.medicationName}`,
          `ExactTime: ${dose.exactTime.toISOString()}`,
          `Status: PENDING`,
        ].join('\n'),
      );

      try {
        const deviceTokens = dose.prescription.patient?.user?.deviceTokens;

        // ── Device Tokens ─────────────────────────────────────────────────────
        if (
          !deviceTokens ||
          deviceTokens.length === 0 ||
          getApps().length === 0
        ) {
          this.logger.debug(`Skipping dose ${dose.id}: no device tokens found`);
          continue;
        }

        this.logger.debug(`Found ${deviceTokens.length} device token(s)`);

        const tokens = deviceTokens.map((dt) => dt.token);

        // ── Before Firebase Send ──────────────────────────────────────────────
        notificationsAttempted++;
        this.logger.debug(
          [
            `Sending notification for dose ${dose.id}`,
            `Tokens count: ${tokens.length}`,
          ].join('\n'),
        );

        const message = {
          notification: {
            title: 'Medication Reminder',
            body: `It is time to take ${dose.prescription.medicationName} - ${dose.prescription.instructions || ''}`,
          },
          tokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);

        // ── After Firebase Response ───────────────────────────────────────────
        const successCount = response.successCount;
        const failureCount = response.failureCount;

        notificationsSucceeded += successCount;
        notificationsFailed += failureCount;

        this.logger.debug(
          [
            `Dose ${dose.id} notification sent`,
            `Success: ${successCount}`,
            `Failed:  ${failureCount}`,
          ].join('\n'),
        );

        // ── Failed Token Cleanup ──────────────────────────────────────────────
        if (failureCount > 0) {
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
                this.logger.warn(`Invalid token detected: ${tokens[idx]}`);
                staleTokens.add(tokens[idx]);
              }
            }
          });
        }
      } catch (error) {
        // ── Per-Dose Error ────────────────────────────────────────────────────
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          [
            `Failed to process dose ${dose.id}`,
            `Error message: ${err.message}`,
            `Stack: ${err.stack ?? 'unavailable'}`,
          ].join('\n'),
        );
      }
    }

    // 4. Single batch delete for all stale tokens (replaces fire-and-forget deletes)
    let staleTokensRemoved = 0;

    if (staleTokens.size > 0) {
      try {
        const { count } = await this.prisma.deviceToken.deleteMany({
          where: { token: { in: [...staleTokens] } },
        });
        staleTokensRemoved = count;
        this.logger.log(`Deleted ${count} stale device token(s)`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          [
            'Failed to delete stale device tokens',
            `Error message: ${err.message}`,
            `Stack: ${err.stack ?? 'unavailable'}`,
          ].join('\n'),
        );
      }
    }

    // ── Cron Summary ──────────────────────────────────────────────────────────
    this.logger.log(
      [
        'Cron completed',
        `Pending doses processed:   ${pendingDoses.length}`,
        `Notifications attempted:   ${notificationsAttempted}`,
        `Notifications succeeded:   ${notificationsSucceeded}`,
        `Notifications failed:      ${notificationsFailed}`,
        `Stale tokens removed:      ${staleTokensRemoved}`,
      ].join('\n'),
    );
  }
}
