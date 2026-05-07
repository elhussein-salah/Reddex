import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  E164_PHONE_ERROR_MESSAGE,
  E164_PHONE_REGEX,
  normalizePhone,
} from 'src/common/utils/phone.util';
import { Gender } from 'src/generated/prisma/enums';

export class AdminRegisterDto {
  @ApiProperty({
    example: 'Admin User',
    description: 'Full name of the admin',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Unique email address for admin account',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    example: 'S3cureP@ssw0rd!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @IsStrongPassword(
    {
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol',
    },
  )
  password: string;

  @ApiProperty({
    example: '+12025550198',
    description: 'Contact phone number in international format (E.164)',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Phone number cannot be empty' })
  @Matches(E164_PHONE_REGEX, {
    message: E164_PHONE_ERROR_MESSAGE,
  })
  phone: string;

  @ApiProperty({ example: 'MALE', enum: Gender })
  @IsEnum(Gender)
  @IsNotEmpty({ message: 'Gender cannot be empty' })
  gender: Gender;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty({ message: 'SSN cannot be empty' })
  @MaxLength(14, { message: 'SSN must not exceed 14 characters' })
  @Matches(/^[0-9]{9}$/, { message: 'SSN must be 9 digits' })
  SSN: string;

  @ApiProperty({
    example: '1980-01-01',
    description: 'Date of birth',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Birthdate cannot be empty' })
  birthdate: string;
}
