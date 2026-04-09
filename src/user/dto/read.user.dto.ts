import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums';

export class ReadUserDto {
  @ApiProperty({
    example: 101,
    description: 'Unique identifier of the user',
  })
  @IsInt()
  id: number;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    enum: Role,
    example: Role.PATIENT,
    description: 'Role assigned to the user',
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    example: false,
    description: 'Whether the user account is active',
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    example: '2026-03-20T08:31:00.000Z',
    description: 'Record creation timestamp in ISO-8601 format',
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    example: '2026-03-22T10:05:12.000Z',
    description: 'Last update timestamp in ISO-8601 format',
  })
  @IsDateString()
  updatedAt: string;
}
