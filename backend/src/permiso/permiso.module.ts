import { Module } from '@nestjs/common';
import { PermisoService } from './permiso.service';
import { PermisoController } from './permiso.controller';
import { PermisoDbService } from './permiso-db/permiso-db.service';

@Module({
  controllers: [PermisoController],
  providers: [PermisoService, PermisoDbService],
})
export class PermisoModule {}
