import { Module } from '@nestjs/common';
import { RegionService } from './region.service';
import { RegionController } from './region.controller';
import { Region\regionDbService } from './region-db/region/region-db.service';

@Module({
  controllers: [RegionController],
  providers: [RegionService, Region\regionDbService],
})
export class RegionModule {}
