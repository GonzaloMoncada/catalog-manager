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
import { PermisoService } from './permiso.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';

@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @RequirePermissions(Permisos.PERMISO_CREATE)
  @Post()
  crearPermiso(@Body() createPermisoDto: CreatePermisoDto) {
    return this.permisoService.crearPermiso(createPermisoDto);
  }

  @RequirePermissions(Permisos.PERMISO_READ)
  @Get()
  obtenerPermisos(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.permisoService.obtenerPermisos(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @RequirePermissions(Permisos.PERMISO_READ)
  @Get(':id')
  obtenerPermisoPorId(@Param('id') id: string) {
    return this.permisoService.obtenerPermisoPorId(+id);
  }

  @RequirePermissions(Permisos.PERMISO_UPDATE)
  @Patch(':id')
  actualizarPermiso(
    @Param('id') id: string,
    @Body() updatePermisoDto: UpdatePermisoDto,
  ) {
    return this.permisoService.actualizarPermiso(+id, updatePermisoDto);
  }

  @RequirePermissions(Permisos.PERMISO_DELETE)
  @Delete(':id')
  eliminarPermiso(@Param('id') id: string) {
    return this.permisoService.eliminarPermiso(+id);
  }
}
