import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/enums';
import { UserService } from 'src/user/user.service';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  let service: AdminAuthService;

  const userService = {
    findByEmail: jest.fn(),
    verifyPassword: jest.fn(),
    createAdmin: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  beforeEach(() => {
    service = new AdminAuthService(userService, jwtService);
    jest.clearAllMocks();
  });

  it('returns token for active super admin login', async () => {
    userService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'super@example.com',
      role: Role.SUPER_ADMIN,
      isActive: true,
    } as any);
    userService.verifyPassword.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login(
      { email: 'super@example.com', password: 'S3cureP@ssw0rd!' },
      'req-1',
    );

    expect(result.statusCode).toBe(200);
    expect(result.data).toEqual({ token: 'jwt-token' });
  });

  it('rejects login when role is not admin/super admin', async () => {
    userService.findByEmail.mockResolvedValue({
      id: 2,
      email: 'patient@example.com',
      role: Role.PATIENT,
      isActive: true,
    } as any);
    userService.verifyPassword.mockResolvedValue(true);

    await expect(
      service.login({ email: 'patient@example.com', password: 'password' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects login when account is inactive', async () => {
    userService.findByEmail.mockResolvedValue({
      id: 3,
      email: 'admin@example.com',
      role: Role.ADMIN,
      isActive: false,
    } as any);
    userService.verifyPassword.mockResolvedValue(true);

    await expect(
      service.login({ email: 'admin@example.com', password: 'password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates admin for super admin actor', async () => {
    userService.createAdmin.mockResolvedValue({
      id: 10,
      name: 'Admin User',
      email: 'admin@example.com',
      role: Role.ADMIN,
      isActive: true,
    } as any);

    const result = await service.registerAdmin(
      { sub: 1, role: Role.SUPER_ADMIN },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'S3cureP@ssw0rd!',
        phone: '+12025550198',
      },
      'req-2',
    );

    expect(result.statusCode).toBe(201);
    expect(userService.createAdmin).toHaveBeenCalled();
  });

  it('denies admin registration for non-super admin actor', async () => {
    await expect(
      service.registerAdmin(
        { sub: 2, role: Role.ADMIN },
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'S3cureP@ssw0rd!',
          phone: '+12025550198',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
