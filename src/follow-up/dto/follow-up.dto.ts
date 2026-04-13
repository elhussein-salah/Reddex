import { IsInt, IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FollowUpStatus } from '../../generated/prisma/client';

export class CreateFollowUpDto {
  @ApiProperty({ description: 'The ID of the doctor to follow up with' })
  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @ApiProperty({ description: 'Notes or reason for the follow-up' })
  @IsString()
  @IsNotEmpty()
  notes: string;
}

export class RespondFollowUpDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsEnum(['ACCEPTED', 'REJECTED'], {
    message: 'status must be either ACCEPTED or REJECTED',
  })
  @IsNotEmpty()
  status: FollowUpStatus;
}
