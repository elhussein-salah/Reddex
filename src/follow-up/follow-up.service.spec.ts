import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpService } from './follow-up.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('FollowUpService', () => {
  let service: FollowUpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<FollowUpService>(FollowUpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
