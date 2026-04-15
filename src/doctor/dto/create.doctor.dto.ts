import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
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
  licenseMedicalNumber: string;

  @ApiProperty({
    example: 10,
    description: 'Years of medical experience',
  })
  @IsNumber()
  @IsNotEmpty()
  yearsExperience: number;
}
