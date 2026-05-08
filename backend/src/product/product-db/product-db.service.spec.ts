import { Test, TestingModule } from '@nestjs/testing';
import { ProductDbService } from './product-db.service';

describe('ProductDbService', () => {
  let service: ProductDbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductDbService],
    }).compile();

    service = module.get<ProductDbService>(ProductDbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
