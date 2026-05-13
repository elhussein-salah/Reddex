import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from 'src/auth/dto';
import { Role } from 'src/enums';
import type { ApiResponse } from 'src/common/interfaces';
import { UserService } from 'src/user/user.service';
import { AdminRegisterDto } from './dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly auditLogger = new Logger('ADMIN_AUDIT');

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, requestId?: string): Promise<ApiResponse> {
    this.logger.log(`Admin login attempt for email: ${dto.email}`);

    const user = await this.userService.findByEmail(dto.email);
    const isPasswordValid = await this.userService.verifyPassword(
      dto.email,
      dto.password,
    );

    if (!isPasswordValid) {
      this.auditLogger.warn(
        `[event=admin_login_failed reason=invalid_credentials email=${dto.email} requestId=${requestId ?? 'n/a'}]`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      this.auditLogger.warn(
        `[event=admin_login_denied reason=insufficient_role userId=${user.id} role=${user.role} requestId=${requestId ?? 'n/a'}]`,
      );
      throw new ForbiddenException('Admin access required');
    }

    if (!user.isActive) {
      this.auditLogger.warn(
        `[event=admin_login_denied reason=inactive_account userId=${user.id} role=${user.role} requestId=${requestId ?? 'n/a'}]`,
      );
      throw new UnauthorizedException('User is not active');
    }

    const payload = { sub: user.id, username: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    this.auditLogger.log(
      `[event=admin_login_success userId=${user.id} role=${user.role} requestId=${requestId ?? 'n/a'}]`,
    );

    return {
      message: 'Login successful',
      statusCode: 200,
      data: { token },
    };
  }

  async registerAdmin(
    actor: { sub: number; role: Role },
    dto: AdminRegisterDto,
    requestId?: string,
  ): Promise<ApiResponse> {
    if (actor.role !== Role.SUPER_ADMIN) {
      this.auditLogger.warn(
        `[event=admin_register_denied reason=insufficient_role actorUserId=${actor.sub} actorRole=${actor.role} targetEmail=${dto.email} requestId=${requestId ?? 'n/a'}]`,
      );
      throw new ForbiddenException(
        'Only super admin can create admin accounts',
      );
    }

    const admin = await this.userService.createAdmin(dto);

    this.auditLogger.log(
      `[event=admin_register_success actorUserId=${actor.sub} actorRole=${actor.role} targetUserId=${admin.id} targetEmail=${admin.email} requestId=${requestId ?? 'n/a'}]`,
    );

    return {
      message: 'Admin registration successful',
      statusCode: 201,
      data: {
        admin,
      },
    };
  }

  async getAdmins(actor: { sub: number; role: Role }, requestId?: string): Promise<ApiResponse> {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      this.auditLogger.warn(
        `[event=get_admins_denied reason=insufficient_role actorUserId=${actor.sub} actorRole=${actor.role} requestId=${requestId ?? 'n/a'}]`,
      );
      throw new ForbiddenException('Only admins and super admins can view the admin list');
    }

    const admins = await this.userService.findAdmins();

    this.auditLogger.log(
      `[event=get_admins_success actorUserId=${actor.sub} actorRole=${actor.role} count=${admins.length} requestId=${requestId ?? 'n/a'}]`,
    );

    return {
      message: 'Admins retrieved successfully',
      statusCode: 200,
      data: admins,
    };
  }
}
