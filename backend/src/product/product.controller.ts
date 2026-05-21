import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductoRegionDto } from './dto/create-producto-region.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  crearProducto(@Body() createProductDto: CreateProductDto) {
    return this.productService.crearProducto(createProductDto);
  }

  @Get()
  obtenerProductos(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.productService.obtenerProductos(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @Get(':id')
  obtenerProductoPorId(@Param('id') id: string) {
    return this.productService.obtenerProductoPorId(+id);
  }

  @Patch(':id')
  actualizarProducto(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.actualizarProducto(+id, updateProductDto);
  }

  @Delete(':id')
  eliminarProducto(@Param('id') id: string) {
    return this.productService.eliminarProducto(+id);
  }

  @Post(':id/region')
  crearProductoRegion(
    @Param('id') id: string,
    @Body() createProductoRegionDto: CreateProductoRegionDto,
  ) {
    return this.productService.crearProductoRegion(+id, createProductoRegionDto);
  }
}
