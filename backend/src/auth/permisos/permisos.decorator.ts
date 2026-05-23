import { SetMetadata } from '@nestjs/common';
import { Permisos } from './permisos.enum';

export const PERMISSIONS_KEY = 'permisos';
export const RequirePermissions = (...permisos: Permisos[]) =>
  SetMetadata(PERMISSIONS_KEY, permisos);
