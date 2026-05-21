import { Module } from '@nestjs/common';
import { RegionService } from './region.service';
import { RegionController } from './region.controller';
import { RegionDbService } from './region-db/region/region-db.service';

@Module({
  controllers: [RegionController],
  providers: [RegionService, RegionDbService],
})
export class RegionModule {}
