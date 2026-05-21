import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RegionService } from './region.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Controller('region')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Post()
  crearRegion(@Body() createRegionDto: CreateRegionDto) {
    return this.regionService.crearRegion(createRegionDto);
  }

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

  @Get(':id')
  obtenerRegionPorId(@Param('id') id: string) {
    return this.regionService.obtenerRegionPorId(+id);
  }

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

  @Patch(':id')
  actualizarRegion(
    @Param('id') id: string,
    @Body() updateRegionDto: UpdateRegionDto,
  ) {
    return this.regionService.actualizarRegion(+id, updateRegionDto);
  }

  @Delete(':id')
  eliminarRegion(@Param('id') id: string) {
    return this.regionService.eliminarRegion(+id);
  }
}
