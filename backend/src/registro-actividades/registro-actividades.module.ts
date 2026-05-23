import { Module } from '@nestjs/common';
import { RegistroActividadesService } from './registro-actividades.service';
import { RegistroActividadesController } from './registro-actividades.controller';
import { RegistroActividadesDbService } from './registro-actividades-db/registro-actividades-db.service';

@Module({
  controllers: [RegistroActividadesController],
  providers: [RegistroActividadesService, RegistroActividadesDbService],
  exports: [RegistroActividadesService],
})
export class RegistroActividadesModule {}
