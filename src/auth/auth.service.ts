import {
  BadRequestException,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly patientsService: PatientsService,
    private readonly doctorService: DoctorService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async login(dto: LoginDto): Promise<ApiResponse> {
    this.logger.log(`Login attempt for email: ${dto.email}`);

    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      this.logger.warn(`Login failed – user not found: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await this.userService.verifyPassword(
      dto.email,
      dto.password,
    );
    if (!isPasswordValid) {
      this.logger.warn(`Login failed – invalid password for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isActive === false) {
      this.logger.warn(`Login failed – inactive account: ${dto.email}`);
      throw new UnauthorizedException('User is not active');
    }
    const payload = { sub: user.id, username: user.email, role: user.role };

    this.logger.log(`Login successful for userId: ${user.id}`);

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
    this.logger.log(`Patient registration attempt for email: ${dto.email}`);

    const patient = await this.patientsService.createPatient(dto, file);
    const payload = {
      sub: patient.user.id,
      username: patient.user.email,
      role: patient.user.role,
    };

    this.logger.log(
      `Patient registered successfully – userId: ${patient.user.id}`,
    );

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
    this.logger.log(`Doctor registration attempt for email: ${dto.email}`);

    const doctor = await this.doctorService.createDoctor(dto, files);
    const payload = {
      sub: doctor.user.id,
      username: doctor.user.email,
      role: doctor.user.role,
    };

    this.logger.log(
      `Doctor registered successfully – userId: ${doctor.user.id}`,
    );

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

    this.logger.log(`Forgot password request for: ${email}`);

    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Security best practice: return same response even if user not found
      this.logger.debug(`Forgot password – no account found for: ${email}`);
      return {
        message: 'If an account exists with this email, an OTP has been sent.',
        statusCode: 200,
      };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash OTP before storing (same as passwords — never store plaintext)
    const hashedOtp = await argon2.hash(otp);

    // Delete existing OTPs for this email
    await this.prisma.passwordResetOtp.deleteMany({ where: { email } });

    // Save hashed OTP
    await this.prisma.passwordResetOtp.create({
      data: {
        email,
        otp: hashedOtp,
        expiresAt,
        attempts: 0,
      },
    });

    try {
      // Send via MailService
      await this.mailService.sendPasswordResetOtp(email, otp);
      this.logger.log(`OTP sent successfully to: ${email}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to send OTP email to: ${email}`, err.stack);
      throw error;
    }

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

    this.logger.log(`Password reset attempt for: ${email}`);

    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      this.logger.warn(`Reset failed – no OTP record for: ${email}`);
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      this.logger.warn(`Reset failed – expired OTP for: ${email}`);
      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.attempts >= 5) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      this.logger.warn(`Reset failed – max attempts exceeded for: ${email}`);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    const isOtpValid = await argon2.verify(otpRecord.otp, otp);
    if (!isOtpValid) {
      await this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      this.logger.warn(
        `Reset failed – invalid OTP for: ${email} (attempt ${otpRecord.attempts + 1})`,
      );
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

    this.logger.log(`Password reset successful for userId: ${user.id}`);

    return {
      message: 'Password reset successfully',
      statusCode: 200,
    };
  }
}
