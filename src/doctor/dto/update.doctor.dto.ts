import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';

export class UpdateDoctorDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Updated full name of the user',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'john.updated@example.com',
    description: 'Updated unique email address',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
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
  password?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.DOCTOR,
    description: 'Updated role assigned to the user',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user account is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
