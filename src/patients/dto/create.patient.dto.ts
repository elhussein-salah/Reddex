import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from 'src/user/dto';

export class CreatePatientDto extends CreateUserDto {
  @ApiProperty({
    example: '1996-05-14',
    description: 'Birth date of the patient',
  })
  @IsDateString(
    {},
    { message: 'Birthdate must be a valid date example: 1996-05-14' },
  )
  birthdate: string;

  @ApiProperty({
    example: '123-45-6789',
    description: 'Unique social security number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Social Security Number cannot be empty' })
  SSN: string;

  @ApiProperty({
    example: 'Stable',
    description: 'Current health status summary',
  })
  @IsString()
  @IsNotEmpty({ message: 'Health Status cannot be empty' })
  healthStatus: string;
}
