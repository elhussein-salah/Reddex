import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiResponse } from 'src/common/interfaces';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { CreatePatientDto } from 'src/patients/dto/create.patient.dto';
import { PatientsService } from 'src/patients/patients.service';
import { CreateDoctorDto } from 'src/doctor/dto/create.doctor.dto';
import { DoctorService } from 'src/doctor/doctor.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly patientsService: PatientsService,
    private readonly doctorService: DoctorService,
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
    file?: Express.Multer.File,
  ): Promise<ApiResponse> {
    const doctor = await this.doctorService.createDoctor(dto, file);
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
}
