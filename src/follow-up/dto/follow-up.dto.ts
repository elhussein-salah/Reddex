import { IsInt, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FollowUpStatus } from '../../generated/prisma/client';

export class CreateFollowUpDto {
  @ApiProperty({ description: 'The ID of the doctor to follow up with' })
  @IsInt()
  @IsNotEmpty()
  doctorId: number;
}

export class RespondFollowUpDto {
  @ApiProperty({
    enum: ['ACCEPTED', 'REJECTED'],
    description: 'Accept or reject the follow-up request',
  })
  @IsNotEmpty()
  @IsIn([FollowUpStatus.ACCEPTED, FollowUpStatus.REJECTED], {
    message: 'status must be either ACCEPTED or REJECTED',
  })
  status: FollowUpStatus;
}
