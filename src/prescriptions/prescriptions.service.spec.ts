import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PrescriptionsService } from './prescriptions.service';
import { ProfileLookupService } from '../common/services/profile-lookup.service';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;

  const prismaMock = {
    doctors: {
      findUnique: jest.fn(),
    },
    patients: {
      findUnique: jest.fn(),
    },
    followUp: {
      findFirst: jest.fn(),
    },
    prescription: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const dto = {
    patientId: 15,
    medicationName: 'Amoxicillin',
    dosage: '500mg',
    frequency: 'Twice daily',
    duration: '7 days',
    instructions: 'Take after meals',
  };

  const profileLookupMock = {
    getPatientIdByUserId: jest.fn(),
    getDoctorIdByUserId: jest.fn(),
  };

  const defaultPagination = {
    skip: 0,
    take: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ProfileLookupService,
          useValue: profileLookupMock,
        },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    jest.clearAllMocks();
  });

  it('creates a prescription when follow-up is active', async () => {
    prismaMock.doctors.findUnique.mockResolvedValue({ id: 7 });
    profileLookupMock.getDoctorIdByUserId.mockResolvedValue(7);
    prismaMock.patients.findUnique.mockResolvedValue({ id: dto.patientId });
    prismaMock.followUp.findFirst.mockResolvedValue({ id: 31 });
    prismaMock.prescription.create.mockResolvedValue({
      id: 44,
      followUpId: 31,
      doctorId: 7,
      patientId: dto.patientId,
      medicationName: dto.medicationName,
      dosage: dto.dosage,
      frequency: dto.frequency,
      duration: dto.duration,
      instructions: dto.instructions,
      status: 'ISSUED',
      issuedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: {
        id: dto.patientId,
        user: {
          id: 90,
          name: 'Patient Name',
          email: 'patient@example.com',
          phone: '+12025550198',
        },
      },
      doctor: {
        id: 7,
        user: {
          id: 70,
          name: 'Doctor Name',
          email: 'doctor@example.com',
          phone: '+12025550100',
        },
      },
    });

    const result = await service.createPrescription(101, dto);

    expect(prismaMock.followUp.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doctorId: 7,
          patientId: dto.patientId,
        }),
      }),
    );
    expect(result.statusCode).toBe(201);
    expect(result.message).toBe('Prescription created successfully');
    expect(prismaMock.prescription.create).toHaveBeenCalledTimes(1);
  });

  it('rejects creation when follow-up exists but is ended/non-active', async () => {
    prismaMock.doctors.findUnique.mockResolvedValue({ id: 7 });
    profileLookupMock.getDoctorIdByUserId.mockResolvedValue(7);
    prismaMock.patients.findUnique.mockResolvedValue({ id: dto.patientId });
    prismaMock.followUp.findFirst.mockResolvedValue(null);

    await expect(service.createPrescription(101, dto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects creation when follow-up has expired (endDate passed)', async () => {
    prismaMock.doctors.findUnique.mockResolvedValue({ id: 7 });
    profileLookupMock.getDoctorIdByUserId.mockResolvedValue(7);
    prismaMock.patients.findUnique.mockResolvedValue({ id: dto.patientId });
    prismaMock.followUp.findFirst.mockResolvedValue(null);

    await expect(service.createPrescription(101, dto)).rejects.toThrow(
      ForbiddenException,
    );

    expect(prismaMock.followUp.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ endDate: null }, { endDate: { gt: expect.any(Date) } }],
        }),
      }),
    );
  });

  it('rejects doctor when patient follow-up belongs to another doctor', async () => {
    prismaMock.doctors.findUnique.mockResolvedValue({ id: 99 });
    profileLookupMock.getDoctorIdByUserId.mockResolvedValue(99);
    prismaMock.patients.findUnique.mockResolvedValue({ id: dto.patientId });
    prismaMock.followUp.findFirst.mockResolvedValue(null);

    await expect(service.createPrescription(101, dto)).rejects.toThrow(
      ForbiddenException,
    );

    expect(prismaMock.followUp.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doctorId: 99,
          patientId: dto.patientId,
        }),
      }),
    );
  });

  it('throws not found for invalid patientId', async () => {
    prismaMock.doctors.findUnique.mockResolvedValue({ id: 7 });
    profileLookupMock.getDoctorIdByUserId.mockResolvedValue(7);
    prismaMock.patients.findUnique.mockResolvedValue(null);

    await expect(service.createPrescription(101, dto)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.followUp.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.prescription.create).not.toHaveBeenCalled();
  });

  it('returns prescriptions for authenticated patient', async () => {
    prismaMock.patients.findUnique.mockResolvedValue({ id: 15 });
    profileLookupMock.getPatientIdByUserId.mockResolvedValue(15);
    prismaMock.prescription.findMany.mockResolvedValue([
      {
        id: 1,
        followUpId: 31,
        doctorId: 7,
        patientId: 15,
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '7 days',
        instructions: 'Take after meals',
        status: 'ISSUED',
        issuedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: 15,
          user: {
            id: 90,
            name: 'Patient Name',
            email: 'patient@example.com',
            phone: '+12025550198',
          },
        },
        doctor: {
          id: 7,
          user: {
            id: 70,
            name: 'Doctor Name',
            email: 'doctor@example.com',
            phone: '+12025550100',
          },
        },
      },
    ]);

    prismaMock.prescription.count = jest.fn().mockResolvedValue(1);

    const result = await service.getMyPrescriptions(101, defaultPagination);

    expect(profileLookupMock.getPatientIdByUserId).toHaveBeenCalledWith(101);
    expect(prismaMock.prescription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: 15 },
      }),
    );
    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Prescriptions fetched successfully');
  });

  it('throws not found when logged-in user has no patient profile', async () => {
    prismaMock.patients.findUnique.mockResolvedValue(null);
    profileLookupMock.getPatientIdByUserId.mockRejectedValue(
      new NotFoundException('Patient profile not found.'),
    );

    await expect(
      service.getMyPrescriptions(202, defaultPagination),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.prescription.findMany).not.toHaveBeenCalled();
  });
});
