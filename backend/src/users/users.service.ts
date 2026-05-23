import { Injectable } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { UsersDbService } from './users-db/users-db.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersDbService: UsersDbService,
    private readonly cache: Cache,
  ) {}

  crearUsuario(data: CreateUserDto) {
    return this.usersDbService.crearUsuario(data);
  }

  obtenerUsuarios(pagina?: number, limite?: number) {
    return this.usersDbService.obtenerUsuarios(pagina, limite);
  }

  obtenerUsuarioPorId(id: number) {
    return this.usersDbService.obtenerUsuarioPorId(id);
  }
  obtenerUsuarioPorCorreo(correo: string) {
    return this.usersDbService.obtenerUsuarioPorCorreo(correo);
  }

  actualizarUsuario(id: number, data: UpdateUserDto) {
    return this.usersDbService.actualizarUsuario(id, data);
  }

  eliminarUsuario(id: number) {
    return this.usersDbService.eliminarUsuario(id);
  }

  async asignarRolAUsuario(usuarioId: number, rolId: number) {
    const result = await this.usersDbService.asignarRolAUsuario(
      usuarioId,
      rolId,
    );
    await this.cache.del(`user:${usuarioId}:permisos`);
    return result;
  }

  obtenerRolesDeUsuario(usuarioId: number) {
    return this.usersDbService.obtenerRolesDeUsuario(usuarioId);
  }

  async quitarRolDeUsuario(usuarioId: number, rolId: number) {
    const result = await this.usersDbService.quitarRolDeUsuario(usuarioId, rolId);
    await this.cache.del(`user:${usuarioId}:permisos`);
    return result;
  }

  habilitar2fa(usuarioId: number, secret: string) {
    return this.usersDbService.habilitar2fa(usuarioId, secret);
  }

  deshabilitar2fa(usuarioId: number) {
    return this.usersDbService.deshabilitar2fa(usuarioId);
  }
}
