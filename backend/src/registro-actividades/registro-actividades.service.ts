import { Injectable } from '@nestjs/common';
import { RegistroActividadesDbService } from './registro-actividades-db/registro-actividades-db.service';
import { CreateRegistroActividadDto } from './dto/create-registro-actividad.dto';
import { UpdateRegistroActividadDto } from './dto/update-registro-actividad.dto';

@Injectable()
export class RegistroActividadesService {
  constructor(private readonly registroActividadesDbService: RegistroActividadesDbService) {}

  crearRegistroActividad(data: CreateRegistroActividadDto) {
    return this.registroActividadesDbService.crearRegistroActividad(data);
  }

  obtenerRegistrosActividades(pagina?: number, limite?: number) {
    return this.registroActividadesDbService.obtenerRegistrosActividades(pagina, limite);
  }

  obtenerRegistroActividadPorId(id: number) {
    return this.registroActividadesDbService.obtenerRegistroActividadPorId(id);
  }

  actualizarRegistroActividad(id: number, data: UpdateRegistroActividadDto) {
    return this.registroActividadesDbService.actualizarRegistroActividad(id, data);
  }

  eliminarRegistroActividad(id: number) {
    return this.registroActividadesDbService.eliminarRegistroActividad(id);
  }
}
