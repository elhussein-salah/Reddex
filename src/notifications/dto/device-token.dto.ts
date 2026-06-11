import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceTokenDto {
  @ApiProperty({
    description: 'The FCM (Firebase Cloud Messaging) device token',
    example: 'cfs1Qk9w...eL8m-a',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiPropertyOptional({
    description: 'The operating system of the device (e.g. android, ios, web)',
    example: 'android',
  })
  @IsString()
  @IsOptional()
  deviceOs?: string;
}

export class DeleteDeviceTokenDto {
  @ApiProperty({
    description: 'The FCM (Firebase Cloud Messaging) device token to remove',
    example: 'cfs1Qk9w...eL8m-a',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}