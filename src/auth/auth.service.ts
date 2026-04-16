import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponse } from 'src/common/interfaces';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { CreatePatientDto } from 'src/patients/dto/create.patient.dto';
import { PatientsService } from 'src/patients/patients.service';
import { CreateDoctorDto } from 'src/doctor/dto/create.doctor.dto';
import { DoctorService } from 'src/doctor/doctor.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as twilio from 'twilio';
import * as argon2 from 'argon2';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { normalizePhone } from 'src/common/utils/phone.util';

@Injectable()
export class AuthService {
  private twilioClient?: twilio.Twilio;
  // Temporary in-memory OTP store for simplicity. (Map<phone, {otp, expiresAt}>)
  private otps = new Map<string, { otp: string; expiresAt: number }>();

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly patientsService: PatientsService,
    private readonly doctorService: DoctorService,
    private readonly prisma: PrismaService,
  ) {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = new twilio.Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    }
  }
  async login(dto: LoginDto): Promise<ApiResponse> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await this.userService.verifyPassword(
      dto.email,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('User is not active');
    }
    const payload = { sub: user.id, username: user.email, role: user.role };
    return {
      data: { token: await this.jwtService.signAsync(payload) },
      message: 'Login successful',
      statusCode: 200,
    };
  }
  async patientRegister(
    dto: CreatePatientDto,
    file?: Express.Multer.File,
  ): Promise<ApiResponse> {
    const patient = await this.patientsService.createPatient(dto, file);
    const payload = {
      sub: patient.user.id,
      username: patient.user.email,
      role: patient.user.role,
    };

    return {
      data: {
        token: await this.jwtService.signAsync(payload),
        patient,
      },
      message: 'Patient registration successful',
      statusCode: 201,
    };
  }

  async doctorRegister(
    dto: CreateDoctorDto,
    files?: {
      profilePicture?: Express.Multer.File[];
      licenseMedicalPhotoUrl?: Express.Multer.File[];
      idCardPhotoUrl?: Express.Multer.File[];
    },
  ): Promise<ApiResponse> {
    const doctor = await this.doctorService.createDoctor(dto, files);
    const payload = {
      sub: doctor.user.id,
      username: doctor.user.email,
      role: doctor.user.role,
    };

    return {
      data: {
        token: await this.jwtService.signAsync(payload),
        doctor,
      },
      message: 'Doctor registration successful',
      statusCode: 201,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<ApiResponse> {
    const normalizedPhone = normalizePhone(dto.phone);

    // We check users by phone because phone is stored on the users table.
    const user = await this.prisma.users.findUnique({
      where: { phone: normalizedPhone },
    });
    if (!user) {
      throw new NotFoundException('User with this phone number not found');
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    this.otps.set(normalizedPhone, { otp, expiresAt });

    // Send OTP via Twilio
    if (this.twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await this.twilioClient.messages.create({
          body: `Your password reset OTP is ${otp}. It is valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: normalizedPhone,
        });
      } catch (error) {
        console.error('Twilio Error:', error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new BadRequestException(
          'Failed to send SMS error message: ' + errorMessage,
        );
      }
    } else {
      console.warn('Twilio credentials not configured. OTP:', otp);
    }

    return {
      message: 'OTP sent successfully',
      statusCode: 200,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<ApiResponse> {
    const normalizedPhone = normalizePhone(dto.phone);
    const record = this.otps.get(normalizedPhone);

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (Date.now() > record.expiresAt) {
      this.otps.delete(normalizedPhone);
      throw new BadRequestException('OTP has expired');
    }

    if (record.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const user = await this.prisma.users.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new NotFoundException('User with this phone number not found');
    }

    // Hash the new password with argon2
    const hashedPassword = await argon2.hash(dto.password);
    // Update the user's password in the database
    await this.prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate OTP after success
    this.otps.delete(normalizedPhone);

    return {
      message: 'Password reset successfully',
      statusCode: 200,
    };
  }
}
