import { Test, TestingModule } from '@nestjs/testing';
import { RolDbService } from './rol-db.service';

describe('RolDbService', () => {
  let service: RolDbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolDbService],
    }).compile();

    service = module.get<RolDbService>(RolDbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
