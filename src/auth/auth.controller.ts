import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { LoginDto } from './dto';
import { AuthService } from './auth.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { CreatePatientDto } from 'src/patients/dto/create.patient.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/config/multer.config';
import { imageFileFilter } from 'src/common/utils/file-filter.util';
import { CreateDoctorDto } from 'src/doctor/dto/create.doctor.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('login')
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials',
    required: true,
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register/patient')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'name',
        'email',
        'password',
        'birthdate',
        'SSN',
        'healthStatus',
      ],
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'StrongPass123' },
        birthdate: { type: 'string', example: '1996-05-14T00:00:00.000Z' },
        SSN: { type: 'string', example: '123-45-6789' },
        healthStatus: { type: 'string', example: 'Stable' },
        profilePicture: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  async registerPatient(
    @Body() dto: CreatePatientDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authService.patientRegister(dto, file);
  }

  @Post('register/doctor')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'name',
        'email',
        'password',
        'specialty',
        'bio',
        'phone',
        'SSN',
        'licenseMedical',
      ],
      properties: {
        name: { type: 'string', example: 'Dr. Sarah Ahmed' },
        email: { type: 'string', example: 'sarah.ahmed@example.com' },
        password: { type: 'string', example: 'StrongPass123' },
        specialty: { type: 'string', example: 'Cardiology' },
        bio: {
          type: 'string',
          example: 'Board-certified cardiologist with 10 years of experience.',
        },
        phone: { type: 'string', example: '+1-202-555-0198' },
        SSN: { type: 'string', example: '123-45-6789' },
        licenseMedical: { type: 'string', example: 'LIC-MED-2026-001' },
        profilePicture: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  async registerDoctor(
    @Body() dto: CreateDoctorDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authService.doctorRegister(dto, file);
  }
}
