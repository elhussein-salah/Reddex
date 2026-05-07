import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';
import { CreateUserDto } from 'src/user/dto';
export class CreatePatientDto extends CreateUserDto {
  @ApiProperty({
    example: 'Stable',
    description: 'Current health status summary',
  })
  @IsString()
  @IsNotEmpty({ message: 'Health Status cannot be empty' })
  @MaxLength(500, { message: 'Health status must not exceed 500 characters' })
  healthStatus: string;

  @ApiProperty({
    example: 'O+',
    description: 'Blood type',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Blood type must not exceed 500 characters' })
  bloodType?: string;

  @ApiProperty({
    example: ['Diabetes', 'Hypertension'],
    description: 'List of pre-existing diseases',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diseases?: string[];

  @ApiProperty({
    example: ['Chemotherapy', 'Radiation'],
    description: 'List of treatments',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  treatments?: string[];
}
