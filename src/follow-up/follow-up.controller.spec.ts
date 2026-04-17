import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

describe('FollowUpController', () => {
  let controller: FollowUpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowUpController],
      providers: [
        { provide: FollowUpService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile();

    controller = module.get<FollowUpController>(FollowUpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
