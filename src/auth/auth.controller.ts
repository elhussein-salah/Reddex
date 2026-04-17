import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { AuthService } from './auth.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { CreatePatientDto } from 'src/patients/dto/create.patient.dto';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { multerConfig } from 'src/common/config/multer.config';
import { imageFileFilter } from 'src/common/utils/file-filter.util';
import { CreateDoctorDto } from 'src/doctor/dto/create.doctor.dto';
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { ttl: 60000, limit: 5 } })
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
        phone: { type: 'string', example: '+12025550198' },
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
        'phone',
        'SSN',
        'licenseMedicalNumber',
        'yearsExperience',
      ],
      properties: {
        name: { type: 'string', example: 'Dr. Sarah Ahmed' },
        email: { type: 'string', example: 'sarah.ahmed@example.com' },
        password: { type: 'string', example: 'StrongPass123' },
        specialty: { type: 'string', example: 'Cardiology' },
        phone: { type: 'string', example: '+12025550198' },
        SSN: { type: 'string', example: '123-45-6789' },
        licenseMedicalNumber: { type: 'string', example: 'LIC-MED-2026-001' },
        yearsExperience: { type: 'number', example: 10 },
        profilePicture: { type: 'string', format: 'binary' },
        licenseMedicalPhotoUrl: { type: 'string', format: 'binary' },
        idCardPhotoUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profilePicture', maxCount: 1 },
        { name: 'licenseMedicalPhotoUrl', maxCount: 1 },
        { name: 'idCardPhotoUrl', maxCount: 1 },
      ],
      {
        ...multerConfig,
        fileFilter: imageFileFilter,
      },
    ),
  )
  async registerDoctor(
    @Body() dto: CreateDoctorDto,
    @UploadedFiles()
    files?: {
      profilePicture?: Express.Multer.File[];
      licenseMedicalPhotoUrl?: Express.Multer.File[];
      idCardPhotoUrl?: Express.Multer.File[];
    },
  ) {
    return this.authService.doctorRegister(dto, files);
  }

  @Post('forgot-password')
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email for OTP',
    required: true,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Email OTP verification and new password',
    required: true,
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.password);
  }
}
