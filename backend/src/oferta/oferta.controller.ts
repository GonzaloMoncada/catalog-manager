import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';

@Controller('oferta')
export class OfertaController {
  constructor(private readonly ofertaService: OfertaService) {}

  @Post()
  crearOferta(@Body() createOfertaDto: CreateOfertaDto) {
    return this.ofertaService.crearOferta(createOfertaDto);
  }

  @Get()
  obtenerOfertas(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.ofertaService.obtenerOfertas(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @Get(':id')
  obtenerOfertaPorId(@Param('id') id: string) {
    return this.ofertaService.obtenerOfertaPorId(+id);
  }

  @Patch(':id')
  actualizarOferta(
    @Param('id') id: string,
    @Body() updateOfertaDto: UpdateOfertaDto,
  ) {
    return this.ofertaService.actualizarOferta(+id, updateOfertaDto);
  }

  @Delete(':id')
  eliminarOferta(@Param('id') id: string) {
    return this.ofertaService.eliminarOferta(+id);
  }
}
