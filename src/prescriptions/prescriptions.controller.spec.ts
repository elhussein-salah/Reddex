import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PaginationDto } from '../common/dto/pagination.dto';

describe('PrescriptionsController', () => {
  let controller: PrescriptionsController;

  const prescriptionsService = {
    createPrescription: jest.fn(),
    getMyPrescriptions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrescriptionsController],
      providers: [
        {
          provide: PrescriptionsService,
          useValue: prescriptionsService,
        },
        { provide: JwtService, useValue: {} },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<PrescriptionsController>(PrescriptionsController);
    jest.clearAllMocks();
  });

  it('uses authenticated doctor identity from request context', async () => {
    const dto = {
      patientId: 11,
      medicationName: 'Metformin',
      dosage: '500mg',
      frequency: 'Once daily',
      duration: '30 days',
      instructions: 'With dinner',
    };

    const req = {
      user: {
        sub: 22,
      },
    } as any;

    prescriptionsService.createPrescription.mockResolvedValue({
      statusCode: 201,
      message: 'Prescription created successfully',
    });

    await controller.create(req, dto);

    expect(prescriptionsService.createPrescription).toHaveBeenCalledWith(
      22,
      dto,
    );
  });

  it('uses authenticated patient identity when listing own prescriptions', async () => {
    const req = {
      user: {
        sub: 51,
      },
    } as any;

    prescriptionsService.getMyPrescriptions.mockResolvedValue({
      statusCode: 200,
      message: 'Prescriptions fetched successfully',
      data: [],
    });

    const pagination = new PaginationDto();

    await controller.findMyPrescriptions(req, pagination);

    expect(prescriptionsService.getMyPrescriptions).toHaveBeenCalledWith(
      51,
      pagination,
    );
  });
});
