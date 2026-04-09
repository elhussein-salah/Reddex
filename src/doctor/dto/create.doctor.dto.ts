import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from 'src/user/dto';

export class CreateDoctorDto extends CreateUserDto {
  @ApiProperty({
    example: 'Cardiology',
    description: 'Doctor medical specialty',
  })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty({
    example: 'Board-certified cardiologist with 10 years of experience.',
    description: 'Doctor professional biography',
  })
  @IsString()
  @IsNotEmpty()
  bio: string;

  @ApiProperty({
    example: '+1-202-555-0198',
    description: 'Doctor contact phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '123-45-6789',
    description: 'Doctor social security number',
  })
  @IsString()
  @IsNotEmpty()
  SSN: string;

  @ApiProperty({
    example: 'LIC-MED-2026-001',
    description: 'Medical license number',
  })
  @IsString()
  @IsNotEmpty()
  licenseMedical: string;
}
