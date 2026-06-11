import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  IsArray,
  IsOptional,
  IsDateString,
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
  @MaxLength(200)
  medicationName: string;

  @ApiProperty({ example: 'Take 1 pill after meal', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  instructions?: string;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  durationInDays: number;

  @ApiProperty({ example: '2026-06-11' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: ['08:00', '20:00'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  timesPerDay: string[];

  @ApiProperty({ example: 'Africa/Cairo', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;
}
