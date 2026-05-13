import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from 'src/auth/dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/role.guard';
import { Roles } from 'src/auth/roles.decorator';
import type { AuthenticatedRequest } from 'src/common/interfaces/AuthenticatedRequest';
import { Role } from 'src/enums';
import { AdminRegisterDto } from './dto';
import { AdminAuthService } from './admin-auth.service';

@ApiTags('Admin Auth')
@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login as admin or super admin' })
  @ApiResponse({ status: 200, description: 'Admin login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiBody({
    type: LoginDto,
    description: 'Admin login credentials',
    required: true,
  })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.adminAuthService.login(dto, requestId);
  }

  @Post('register')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new admin account (super admin only)' })
  @ApiResponse({ status: 201, description: 'Admin registered successfully' })
  @ApiResponse({
    status: 403,
    description: 'Only super admin can create admins',
  })
  @ApiBody({
    type: AdminRegisterDto,
    description: 'Admin account registration payload',
    required: true,
  })
  async registerAdmin(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AdminRegisterDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.adminAuthService.registerAdmin(req.user, dto, requestId);
  }

  @Get('admins')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({ status: 200, description: 'Admins retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Only admin or super admin can view admins',
  })
  async getAdmins(
    @Req() req: AuthenticatedRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.adminAuthService.getAdmins(req.user, requestId);
  }
}
