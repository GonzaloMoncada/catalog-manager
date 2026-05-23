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
import { RegionService } from './region.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { Public } from 'src/auth/public.decorator';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';

@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('region')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @RequirePermissions(Permisos.REGION_CREATE)
  @Post()
  crearRegion(@Body() createRegionDto: CreateRegionDto) {
    return this.regionService.crearRegion(createRegionDto);
  }

  @Public()
  @Get()
  obtenerRegiones(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.regionService.obtenerRegiones(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @Public()
  @Get(':id')
  obtenerRegionPorId(@Param('id') id: string) {
    return this.regionService.obtenerRegionPorId(+id);
  }

  @Public()
  @Get(':id/productos')
  obtenerProductosPorRegion(
    @Param('id') id: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.regionService.obtenerProductosPorRegion(
      +id,
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @RequirePermissions(Permisos.REGION_UPDATE)
  @Patch(':id')
  actualizarRegion(
    @Param('id') id: string,
    @Body() updateRegionDto: UpdateRegionDto,
  ) {
    return this.regionService.actualizarRegion(+id, updateRegionDto);
  }

  @RequirePermissions(Permisos.REGION_DELETE)
  @Delete(':id')
  eliminarRegion(@Param('id') id: string) {
    return this.regionService.eliminarRegion(+id);
  }
}
