import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
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
    description: 'Medication dosage',
    example: '500mg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Dosage must not exceed 100 characters' })
  dosage: string;

  @ApiProperty({
    description: 'How often the medication should be taken',
    example: 'Twice daily',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Frequency must not exceed 200 characters' })
  frequency: string;

  @ApiProperty({
    description: 'Treatment duration',
    example: '7 days',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Duration must not exceed 100 characters' })
  duration: string;

  @ApiPropertyOptional({
    description: 'Additional instructions for the patient',
    example: 'Take after meals',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'Instructions must not exceed 1000 characters',
  })
  instructions?: string;
}
