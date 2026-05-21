import { Module } from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { OfertaController } from './oferta.controller';
import { OfertaDbService } from './oferta-db/oferta/oferta-db.service';

@Module({
  controllers: [OfertaController],
  providers: [OfertaService, OfertaDbService],
})
export class OfertaModule {}
