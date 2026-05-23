import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cache } from '@nestjs/cache-manager';
import { Permisos } from './permisos.enum';
import { PERMISSIONS_KEY } from './permisos.decorator';
import { UsersService } from 'src/users/users.service';

interface UserPermisosCache {
  isAdmin: boolean;
  permisos: string[];
}

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
    private cache: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermisos = this.reflector.getAllAndOverride<Permisos[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermisos) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const cacheKey = `user:${user.userId}:permisos`;

    let cached = await this.cache.get<UserPermisosCache>(cacheKey);
    if (!cached) {
      const rolesDeUsuario = await this.usersService.obtenerRolesDeUsuario(
        user.userId,
      );
      const isAdmin = rolesDeUsuario.some(
        (r) => r.tipo_rol.nombre.toLowerCase() === 'administrador',
      );
      const permisos = rolesDeUsuario.flatMap((r) =>
        r.tipo_rol.roles_permisos.map((rp) => rp.permiso.nombre),
      );
      cached = { isAdmin, permisos };
      await this.cache.set(cacheKey, cached, 300_000);
    }

    if (cached.isAdmin) {
      return true;
    }

    return requiredPermisos.some((p) => cached.permisos.includes(p));
  }
}
