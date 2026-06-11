import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceTokenDto } from './dto/device-token.dto';

@Injectable()
export class NotificationsService {
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
}
