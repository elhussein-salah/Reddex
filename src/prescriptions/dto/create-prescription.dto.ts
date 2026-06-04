import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePrescriptionDto {
  @ApiProperty({
    description: 'Patient identifier to prescribe medication for',
    example: 12,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  patientId: number;

  @ApiProperty({
    description: 'Medication name',
    example: 'Amoxicillin',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Medication name must not exceed 200 characters' })
  medicationName: string;

  @ApiProperty({
    description: 'Treatment duration',
    example: '7 days',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Duration must not exceed 100 characters' })
  duration: string;
}
