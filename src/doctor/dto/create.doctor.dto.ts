import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CreateUserDto } from 'src/user/dto';

export class CreateDoctorDto extends CreateUserDto {
  @ApiProperty({
    example: 'Cardiology',
    description: 'Doctor medical specialty',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Specialty must not exceed 100 characters' })
  specialty: string;

  @ApiProperty({
    example: 'LIC-MED-2026-001',
    description: 'Medical license number',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'License number must not exceed 50 characters' })
  licenseMedicalNumber: string;

  @ApiProperty({
    example: 10,
    description: 'Years of medical experience',
  })
  @IsNumberString()
  @IsNotEmpty()
  yearsExperience: number;

  @ApiPropertyOptional({
    example: 'Cairo Heart Clinic',
    description: 'Name of the doctor\'s clinic',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameOfClinic?: string;

  @ApiPropertyOptional({
    example: '12 Tahrir St, Cairo',
    description: 'Physical address of the clinic',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationOfClinic?: string;

  @ApiPropertyOptional({
    example: '09:00 - 17:00',
    description: 'Working hours (e.g. 09:00 - 17:00)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workingHours?: string;

  @ApiPropertyOptional({
    example: ['Monday', 'Tuesday', 'Wednesday'],
    description: 'Days the doctor works',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workdays?: string[];
}
