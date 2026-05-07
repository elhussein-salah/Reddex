import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/enums';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;

  const adminAuthService = {
    login: jest.fn(),
    registerAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: AdminAuthService,
          useValue: adminAuthService,
        },
        { provide: JwtService, useValue: {} },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
    jest.clearAllMocks();
  });

  it('passes request id to login service', async () => {
    const dto = { email: 'admin@example.com', password: 'S3cureP@ssw0rd!' };

    await controller.login(dto, 'req-123');

    expect(adminAuthService.login).toHaveBeenCalledWith(dto, 'req-123');
  });

  it('uses authenticated super admin identity for register', async () => {
    const req = {
      user: {
        sub: 7,
        username: 'super@example.com',
        role: Role.SUPER_ADMIN,
      },
    } as any;

    const dto = {
      name: 'Admin User',
      email: 'admin2@example.com',
      password: 'S3cureP@ssw0rd!',
      phone: '+12025550198',
    };

    await controller.registerAdmin(req, dto, 'req-456');

    expect(adminAuthService.registerAdmin).toHaveBeenCalledWith(
      req.user,
      dto,
      'req-456',
    );
  });
});
