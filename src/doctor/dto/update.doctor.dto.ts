import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO for updating a doctor profile.
 * Role changes are intentionally excluded — role management
 * should be done via admin endpoints only.
 */
export class UpdateDoctorDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Updated full name of the user',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'john.updated@example.com',
    description: 'Updated unique email address',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 'N3wS3cureP@ssw0rd!',
    description: 'Updated plain password before hashing',
    minLength: 8,
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user account is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: '+201234567890',
    description: 'Updated phone number',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // ── Doctor-specific fields ──

  @ApiPropertyOptional({
    example: 'Cardiology',
    description: 'Updated medical specialty',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Updated years of medical experience',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({
    example: 'Cairo Heart Clinic',
    description: 'Name of the clinic',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameOfClinic?: string;

  @ApiPropertyOptional({
    example: '12 Tahrir St, Cairo',
    description: 'Address of the clinic',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationOfClinic?: string;

  @ApiPropertyOptional({
    example: '09:00 - 17:00',
    description: 'Working hours',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workingHours?: string;

  @ApiPropertyOptional({
    example: ['Monday', 'Wednesday', 'Friday'],
    description: 'Working days',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workdays?: string[];
}
