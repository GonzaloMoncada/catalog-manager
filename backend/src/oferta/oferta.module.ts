import { Module } from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { OfertaController } from './oferta.controller';
import { Oferta\ofertaDbService } from './oferta-db/oferta/oferta-db.service';

@Module({
  controllers: [OfertaController],
  providers: [OfertaService, Oferta\ofertaDbService],
})
export class OfertaModule {}
