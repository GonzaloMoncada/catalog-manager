import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolService } from './rol.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { AsignarPermisoDto } from './dto/asignar-permiso.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';
import { AuditTable } from 'src/registro-actividades/audit.decorator';

@AuditTable('tipos_roles')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('rol')
export class RolController {
  constructor(private readonly rolService: RolService) {}

  @RequirePermissions(Permisos.ROL_CREATE)
  @Post()
  crearRol(@Body() createRolDto: CreateRolDto) {
    return this.rolService.crearRol(createRolDto);
  }

  @RequirePermissions(Permisos.ROL_READ)
  @Get()
  obtenerRoles(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.rolService.obtenerRoles(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @RequirePermissions(Permisos.ROL_READ)
  @Get(':id')
  obtenerRolPorId(@Param('id') id: string) {
    return this.rolService.obtenerRolPorId(+id);
  }

  @RequirePermissions(Permisos.ROL_UPDATE)
  @Patch(':id')
  actualizarRol(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolService.actualizarRol(+id, updateRolDto);
  }

  @RequirePermissions(Permisos.ROL_DELETE)
  @Delete(':id')
  eliminarRol(@Param('id') id: string) {
    return this.rolService.eliminarRol(+id);
  }

  @RequirePermissions(Permisos.ROL_UPDATE)
  @Post(':id/permiso')
  asignarPermisoARol(@Param('id') id: string, @Body() body: AsignarPermisoDto) {
    return this.rolService.asignarPermisoARol(+id, body.permiso_id);
  }

  @RequirePermissions(Permisos.ROL_READ)
  @Get(':id/permiso')
  obtenerPermisosDeRol(@Param('id') id: string) {
    return this.rolService.obtenerPermisosDeRol(+id);
  }

  @RequirePermissions(Permisos.ROL_UPDATE)
  @Delete(':id/permiso/:permisoId')
  quitarPermisoDeRol(
    @Param('id') id: string,
    @Param('permisoId') permisoId: string,
  ) {
    return this.rolService.quitarPermisoDeRol(+id, +permisoId);
  }
}
