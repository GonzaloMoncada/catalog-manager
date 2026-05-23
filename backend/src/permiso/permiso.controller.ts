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

@UseGuards(JwtAuthGuard)
@Controller('permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @Post()
  crearPermiso(@Body() createPermisoDto: CreatePermisoDto) {
    return this.permisoService.crearPermiso(createPermisoDto);
  }

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

  @Get(':id')
  obtenerPermisoPorId(@Param('id') id: string) {
    return this.permisoService.obtenerPermisoPorId(+id);
  }

  @Patch(':id')
  actualizarPermiso(
    @Param('id') id: string,
    @Body() updatePermisoDto: UpdatePermisoDto,
  ) {
    return this.permisoService.actualizarPermiso(+id, updatePermisoDto);
  }

  @Delete(':id')
  eliminarPermiso(@Param('id') id: string) {
    return this.permisoService.eliminarPermiso(+id);
  }
}
