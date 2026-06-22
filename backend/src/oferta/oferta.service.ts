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

  obtenerOfertas(
    pagina?: number,
    limite?: number,
    buscar?: string,
    estado?: string,
    orderBy?: string,
    orderDir?: 'asc' | 'desc',
  ) {
    return this.ofertaDbService.obtenerOfertas(
      pagina,
      limite,
      buscar,
      estado,
      orderBy,
      orderDir,
    );
  }

  obtenerOfertasActivas(
    pagina?: number,
    limite?: number,
    buscar?: string,
    estado?: string,
    orderBy?: string,
    orderDir?: 'asc' | 'desc',
  ) {
    return this.ofertaDbService.obtenerOfertasActivas(
      pagina,
      limite,
      buscar,
      estado,
      orderBy,
      orderDir,
    );
  }

  obtenerOfertaPorId(id: number) {
    return this.ofertaDbService.obtenerOfertaPorId(id);
  }

  obtenerOfertaActivaPorId(id: number) {
    return this.ofertaDbService.obtenerOfertaActivaPorId(id);
  }

  actualizarOferta(id: number, data: UpdateOfertaDto) {
    return this.ofertaDbService.actualizarOferta(id, data);
  }

  eliminarOferta(id: number) {
    return this.ofertaDbService.eliminarOferta(id);
  }
}
