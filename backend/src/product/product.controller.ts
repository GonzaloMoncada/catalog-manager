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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductoRegionDto } from './dto/create-producto-region.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from 'src/auth/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  crearProducto(@Body() createProductDto: CreateProductDto) {
    return this.productService.crearProducto(createProductDto);
  }

  @Public()
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

  @Public()
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
    return this.productService.crearProductoRegion(
      +id,
      createProductoRegionDto,
    );
  }
}
