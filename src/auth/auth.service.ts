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
import { MailService } from 'src/mail/mail.service';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly patientsService: PatientsService,
    private readonly doctorService: DoctorService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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

  async forgotPassword(emailInput: string): Promise<ApiResponse> {
    const email = emailInput.trim().toLowerCase();

    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Security best practice: return same response even if user not found
      return {
        message: 'If an account exists with this email, an OTP has been sent.',
        statusCode: 200,
      };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing OTPs for this email
    await this.prisma.passwordResetOtp.deleteMany({ where: { email } });

    // Save new OTP
    await this.prisma.passwordResetOtp.create({
      data: {
        email,
        otp,
        expiresAt,
        attempts: 0,
      },
    });

    // Send via MailService
    await this.mailService.sendPasswordResetOtp(email, otp);

    return {
      message: 'If an account exists with this email, an OTP has been sent.',
      statusCode: 200,
    };
  }

  async resetPassword(
    emailInput: string,
    otp: string,
    password: string,
  ): Promise<ApiResponse> {
    const email = emailInput.trim().toLowerCase();

    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.attempts >= 5) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    if (otpRecord.otp !== otp) {
      await this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await argon2.hash(password);
    await this.prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Clean up
    await this.prisma.passwordResetOtp.delete({ where: { id: otpRecord.id } });

    return {
      message: 'Password reset successfully',
      statusCode: 200,
    };
  }
}
