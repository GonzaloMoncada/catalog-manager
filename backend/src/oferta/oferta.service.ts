import { Injectable } from '@nestjs/common';
import { OfertaDbService } from './oferta-db/oferta/oferta-db.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';

@Injectable()
export class OfertaService {
  constructor(private readonly ofertaDbService: OfertaDbService) {}

  crearOferta(data: CreateOfertaDto) {
    return this.ofertaDbService.crearOferta(data);
  }

  obtenerOfertas(pagina?: number, limite?: number) {
    return this.ofertaDbService.obtenerOfertas(pagina, limite);
  }

  obtenerOfertaPorId(id: number) {
    return this.ofertaDbService.obtenerOfertaPorId(id);
  }

  actualizarOferta(id: number, data: UpdateOfertaDto) {
    return this.ofertaDbService.actualizarOferta(id, data);
  }

  eliminarOferta(id: number) {
    return this.ofertaDbService.eliminarOferta(id);
  }
}
