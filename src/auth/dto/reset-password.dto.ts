import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  E164_PHONE_ERROR_MESSAGE,
  E164_PHONE_REGEX,
  normalizePhone,
} from 'src/common/utils/phone.util';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '+12025550198', description: 'Phone number' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsNotEmpty()
  @IsString()
  @Matches(E164_PHONE_REGEX, {
    message: E164_PHONE_ERROR_MESSAGE,
  })
  phone: string;

  @ApiProperty({ example: '123456', description: 'OTP code' })
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiProperty({ example: 'NewStrongPass123', description: 'New password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
