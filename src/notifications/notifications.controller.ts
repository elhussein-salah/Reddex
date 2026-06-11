import { Controller, Post, Delete, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { DeviceTokenDto, DeleteDeviceTokenDto } from './dto/device-token.dto';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/AuthenticatedRequest';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device-token')
  @ApiOperation({ summary: 'Register or update FCM device token' })
  async saveDeviceToken(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeviceTokenDto,
  ) {
    await this.notificationsService.saveDeviceToken(req.user.sub, dto);
    return { status: 'success', message: 'Device token saved successfully.' };
  }

  @Delete('device-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove FCM device token (e.g. on logout)' })
  async removeDeviceToken(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeleteDeviceTokenDto,
  ) {
    await this.notificationsService.removeDeviceToken(req.user.sub, dto.fcmToken);
    return { status: 'success', message: 'Device token removed successfully.' };
  }
}
