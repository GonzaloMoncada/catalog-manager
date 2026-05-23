import { Injectable } from '@nestjs/common';
import { PermisoDbService } from './permiso-db/permiso-db.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';

@Injectable()
export class PermisoService {
  constructor(private readonly permisoDbService: PermisoDbService) {}

  crearPermiso(data: CreatePermisoDto) {
    return this.permisoDbService.crearPermiso(data);
  }

  obtenerPermisos(pagina?: number, limite?: number) {
    return this.permisoDbService.obtenerPermisos(pagina, limite);
  }

  obtenerPermisoPorId(id: number) {
    return this.permisoDbService.obtenerPermisoPorId(id);
  }

  actualizarPermiso(id: number, data: UpdatePermisoDto) {
    return this.permisoDbService.actualizarPermiso(id, data);
  }

  eliminarPermiso(id: number) {
    return this.permisoDbService.eliminarPermiso(id);
  }
}
