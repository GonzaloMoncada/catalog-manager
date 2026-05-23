import { Module } from '@nestjs/common';
import { RolService } from './rol.service';
import { RolController } from './rol.controller';
import { RolDbService } from './rol-db/rol-db.service';

@Module({
  controllers: [RolController],
  providers: [RolService, RolDbService],
})
export class RolModule {}
