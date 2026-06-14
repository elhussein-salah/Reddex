import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceTokenDto } from './dto/device-token.dto';
import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveDeviceToken(userId: number, dto: DeviceTokenDto) {
    const existingToken = await this.prisma.deviceToken.findUnique({
      where: { token: dto.fcmToken },
    });

    if (existingToken) {
      if (existingToken.userId !== userId) {
        return this.prisma.deviceToken.update({
          where: { id: existingToken.id },
          data: { userId, deviceOs: dto.deviceOs },
        });
      }
      return existingToken;
    }

    return this.prisma.deviceToken.create({
      data: {
        userId,
        token: dto.fcmToken,
        deviceOs: dto.deviceOs,
      },
    });
  }

  async removeDeviceToken(userId: number, fcmToken: string) {
    const existingToken = await this.prisma.deviceToken.findUnique({
      where: { token: fcmToken },
    });

    if (existingToken && existingToken.userId === userId) {
      return this.prisma.deviceToken.delete({
        where: { id: existingToken.id },
      });
    }
  }

  /**
   * Sends a push notification to a specific user's devices.
   * Handles missing tokens, Firebase unavailability, and stale token cleanup.
   * Never throws — all errors are logged and swallowed so callers are not disrupted.
   */
  async sendPushNotification(
    userId: number,
    title: string,
    body: string,
  ): Promise<boolean> {
    try {
      if (getApps().length === 0) {
        this.logger.warn(
          `Cannot send push notification to userId ${userId}: Firebase not initialized`,
        );
        return false;
      }

      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });

      if (deviceTokens.length === 0) {
        this.logger.debug(
          `No device tokens found for userId ${userId}, skipping notification`,
        );
        return false;
      }

      const tokens = deviceTokens.map((dt) => dt.token);

      this.logger.debug(
        `Sending push notification to userId ${userId} (${tokens.length} token(s))`,
      );

      const response = await getMessaging().sendEachForMulticast({
        notification: { title, body },
        tokens,
      });

      this.logger.debug(
        [
          `Push notification result for userId ${userId}`,
          `Success: ${response.successCount}`,
          `Failed:  ${response.failureCount}`,
        ].join('\n'),
      );

      // Clean up stale tokens
      if (response.failureCount > 0) {
        const staleTokens: string[] = [];
        const errorCodesToDelete = [
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
        ];

        response.responses.forEach((res, idx) => {
          if (
            !res.success &&
            res.error?.code &&
            errorCodesToDelete.includes(res.error.code)
          ) {
            staleTokens.push(tokens[idx]);
          }
        });

        if (staleTokens.length > 0) {
          const { count } = await this.prisma.deviceToken.deleteMany({
            where: { token: { in: staleTokens } },
          });
          this.logger.log(`Deleted ${count} stale device token(s) for userId ${userId}`);
        }
      }

      return response.successCount > 0;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        [
          `Failed to send push notification to userId ${userId}`,
          `Error: ${err.message}`,
          `Stack: ${err.stack ?? 'unavailable'}`,
        ].join('\n'),
      );
      return false;
    }
  }
}
