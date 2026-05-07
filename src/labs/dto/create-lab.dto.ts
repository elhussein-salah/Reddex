import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateLabDto {
  @ApiProperty({ example: 'Cairo Central Lab', description: 'Lab name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    example: '08:00 - 20:00',
    description: 'Working hours',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workhours?: string;

  @ApiPropertyOptional({
    example: ['Sunday', 'Monday', 'Tuesday'],
    description: 'Working days',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workdays?: string[];

  @ApiPropertyOptional({
    example: '+201234567890',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: '15 Ramses St, Cairo',
    description: 'Physical location / address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    example: 'https://cairocentrallab.com',
    description: 'Lab website URL',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  websiteUrl?: string;
}
