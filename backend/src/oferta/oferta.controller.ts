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
import { OfertaService } from './oferta.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { Public } from 'src/auth/public.decorator';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';
import { AuditTable } from 'src/registro-actividades/audit.decorator';

@AuditTable('ofertas')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('oferta')
export class OfertaController {
  constructor(private readonly ofertaService: OfertaService) {}

  @RequirePermissions(Permisos.OFERTA_CREATE)
  @Post()
  crearOferta(@Body() createOfertaDto: CreateOfertaDto) {
    return this.ofertaService.crearOferta(createOfertaDto);
  }

  @Public()
  @Get()
  obtenerOfertas(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Query('buscar') buscar?: string,
    @Query('estado') estado?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: string,
  ) {
    return this.ofertaService.obtenerOfertasActivas(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
      buscar,
      estado,
      orderBy,
      orderDir as 'asc' | 'desc' | undefined,
    );
  }

  @RequirePermissions(Permisos.OFERTA_READ)
  @Get('todas')
  obtenerTodasLasOfertas(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Query('buscar') buscar?: string,
    @Query('estado') estado?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: string,
  ) {
    return this.ofertaService.obtenerOfertas(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
      buscar,
      estado,
      orderBy,
      orderDir as 'asc' | 'desc' | undefined,
    );
  }

  @RequirePermissions(Permisos.OFERTA_READ)
  @Get('todas/:id')
  obtenerOfertaPorIdAdmin(@Param('id') id: string) {
    return this.ofertaService.obtenerOfertaPorId(+id);
  }

  @Public()
  @Get(':id')
  obtenerOfertaPorId(@Param('id') id: string) {
    return this.ofertaService.obtenerOfertaActivaPorId(+id);
  }

  @RequirePermissions(Permisos.OFERTA_UPDATE)
  @Patch(':id')
  actualizarOferta(
    @Param('id') id: string,
    @Body() updateOfertaDto: UpdateOfertaDto,
  ) {
    return this.ofertaService.actualizarOferta(+id, updateOfertaDto);
  }

  @RequirePermissions(Permisos.OFERTA_DELETE)
  @Delete(':id')
  eliminarOferta(@Param('id') id: string) {
    return this.ofertaService.eliminarOferta(+id);
  }
}
