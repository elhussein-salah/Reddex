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
  ArrayNotEmpty,
  Matches,
} from 'class-validator';

export class CreatePrescriptionDto {
  @ApiProperty({
    description: 'Patient identifier to prescribe medication for',
    example: 12,
  })
  @IsNotEmpty({ message: 'patientId is required' })
  @IsInt({ message: 'patientId must be an integer' })
  @Min(1, { message: 'patientId must be a positive integer' })
  patientId: number;

  @ApiProperty({
    description: 'Medication name',
    example: 'Amoxicillin',
  })
  @IsNotEmpty({ message: 'medicationName is required' })
  @IsString({ message: 'medicationName must be a string' })
  @MaxLength(200, { message: 'medicationName must not exceed 200 characters' })
  medicationName: string;

  @ApiProperty({ example: 'Take 1 pill after meal', required: false })
  @IsOptional()
  @IsString({ message: 'instructions must be a string' })
  @MaxLength(500, { message: 'instructions must not exceed 500 characters' })
  instructions?: string;

  @ApiProperty({ example: 7 })
  @IsNotEmpty({ message: 'durationInDays is required' })
  @IsInt({ message: 'durationInDays must be an integer' })
  @Min(1, { message: 'durationInDays must be at least 1 day' })
  durationInDays: number;

  @ApiProperty({ example: '2026-06-11' })
  @IsNotEmpty({ message: 'startDate is required' })
  @IsDateString(
    {},
    {
      message:
        'startDate must be a valid ISO 8601 date string (e.g. 2026-06-11)',
    },
  )
  startDate: string;

  @ApiProperty({ example: ['08:00', '20:00'] })
  @IsNotEmpty({ message: 'timesPerDay is required' })
  @IsArray({ message: 'timesPerDay must be an array of time strings' })
  @ArrayNotEmpty({
    message: 'timesPerDay must contain at least one time entry',
  })
  @IsString({
    each: true,
    message: 'each entry in timesPerDay must be a string',
  })
  @Matches(/^\d{2}:\d{2}$/, {
    each: true,
    message: 'each time in timesPerDay must be in HH:mm format (e.g. 08:00)',
  })
  timesPerDay: string[];

  @ApiProperty({ example: 'Africa/Cairo', required: false })
  @IsOptional()
  @IsString({ message: 'timezone must be a string' })
  timezone?: string;
}
