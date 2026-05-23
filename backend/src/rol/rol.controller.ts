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

@UseGuards(JwtAuthGuard)
@Controller('rol')
export class RolController {
  constructor(private readonly rolService: RolService) {}

  @Post()
  crearRol(@Body() createRolDto: CreateRolDto) {
    return this.rolService.crearRol(createRolDto);
  }

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

  @Get(':id')
  obtenerRolPorId(@Param('id') id: string) {
    return this.rolService.obtenerRolPorId(+id);
  }

  @Patch(':id')
  actualizarRol(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolService.actualizarRol(+id, updateRolDto);
  }

  @Delete(':id')
  eliminarRol(@Param('id') id: string) {
    return this.rolService.eliminarRol(+id);
  }

  @Post(':id/permiso')
  asignarPermisoARol(@Param('id') id: string, @Body() body: AsignarPermisoDto) {
    return this.rolService.asignarPermisoARol(+id, body.permiso_id);
  }

  @Get(':id/permiso')
  obtenerPermisosDeRol(@Param('id') id: string) {
    return this.rolService.obtenerPermisosDeRol(+id);
  }

  @Delete(':id/permiso/:permisoId')
  quitarPermisoDeRol(
    @Param('id') id: string,
    @Param('permisoId') permisoId: string,
  ) {
    return this.rolService.quitarPermisoDeRol(+id, +permisoId);
  }
}
