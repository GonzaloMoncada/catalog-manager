import { Injectable } from '@nestjs/common';
import { RolDbService } from './rol-db/rol-db.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Injectable()
export class RolService {
  constructor(private readonly rolDbService: RolDbService) {}

  crearRol(data: CreateRolDto) {
    return this.rolDbService.crearRol(data);
  }

  obtenerRoles(pagina?: number, limite?: number) {
    return this.rolDbService.obtenerRoles(pagina, limite);
  }

  obtenerRolPorId(id: number) {
    return this.rolDbService.obtenerRolPorId(id);
  }

  actualizarRol(id: number, data: UpdateRolDto) {
    return this.rolDbService.actualizarRol(id, data);
  }

  eliminarRol(id: number) {
    return this.rolDbService.eliminarRol(id);
  }

  asignarPermisoARol(rolId: number, permisoId: number) {
    return this.rolDbService.asignarPermisoARol(rolId, permisoId);
  }

  obtenerPermisosDeRol(rolId: number) {
    return this.rolDbService.obtenerPermisosDeRol(rolId);
  }

  quitarPermisoDeRol(rolId: number, permisoId: number) {
    return this.rolDbService.quitarPermisoDeRol(rolId, permisoId);
  }
}
