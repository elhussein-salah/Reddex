import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty } from 'class-validator';

export class ManageDoctorStatusDto {
  @ApiProperty({ description: 'The ID of the user (doctor)' })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'True to approve, false to reject/delete',
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
