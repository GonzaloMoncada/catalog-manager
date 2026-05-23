import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cache } from '@nestjs/cache-manager';
import { Permisos } from './permisos.enum';
import { PERMISSIONS_KEY } from './permisos.decorator';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
    private cache: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermisos = this.reflector.getAllAndOverride<Permisos[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermisos) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const cacheKey = `user:${user.userId}:permisos`;

    let userPermisos = await this.cache.get<string[]>(cacheKey);
    if (!userPermisos) {
      const rolesDeUsuario = await this.usersService.obtenerRolesDeUsuario(user.userId);
      userPermisos = rolesDeUsuario.flatMap((r) =>
        r.tipo_rol.roles_permisos.map((rp) => rp.permiso.nombre),
      );
      await this.cache.set(cacheKey, userPermisos, 300_000);
    }

    return requiredPermisos.some((p) => userPermisos!.includes(p));
  }
}
