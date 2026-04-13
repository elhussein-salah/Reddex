import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+12025550198', description: 'Phone number' })
  @IsNotEmpty()
  @IsString()
  phone: string;
}
