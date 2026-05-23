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
import { RegistroActividadesService } from './registro-actividades.service';
import { CreateRegistroActividadDto } from './dto/create-registro-actividad.dto';
import { UpdateRegistroActividadDto } from './dto/update-registro-actividad.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';
import { SkipAudit } from './audit.decorator';

@SkipAudit()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('registro-actividades')
export class RegistroActividadesController {
  constructor(
    private readonly registroActividadesService: RegistroActividadesService,
  ) {}

  @RequirePermissions(Permisos.REGISTRO_ACTIVIDAD_READ)
  @Post()
  crearRegistroActividad(
    @Body() createRegistroActividadDto: CreateRegistroActividadDto,
  ) {
    return this.registroActividadesService.crearRegistroActividad(
      createRegistroActividadDto,
    );
  }

  @RequirePermissions(Permisos.REGISTRO_ACTIVIDAD_READ)
  @Get()
  obtenerRegistrosActividades(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.registroActividadesService.obtenerRegistrosActividades(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @RequirePermissions(Permisos.REGISTRO_ACTIVIDAD_READ)
  @Get(':id')
  obtenerRegistroActividadPorId(@Param('id') id: string) {
    return this.registroActividadesService.obtenerRegistroActividadPorId(+id);
  }

  @RequirePermissions(Permisos.REGISTRO_ACTIVIDAD_DELETE)
  @Delete(':id')
  eliminarRegistroActividad(@Param('id') id: string) {
    return this.registroActividadesService.eliminarRegistroActividad(+id);
  }
}
