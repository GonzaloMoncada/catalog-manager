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
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { Public } from 'src/auth/public.decorator';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';
import { AuditTable } from 'src/registro-actividades/audit.decorator';

@AuditTable('productos')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @RequirePermissions(Permisos.PRODUCTO_CREATE)
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

  @RequirePermissions(Permisos.PRODUCTO_UPDATE)
  @Patch(':id')
  actualizarProducto(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.actualizarProducto(+id, updateProductDto);
  }

  @RequirePermissions(Permisos.PRODUCTO_DELETE)
  @Delete(':id')
  eliminarProducto(@Param('id') id: string) {
    return this.productService.eliminarProducto(+id);
  }

  @RequirePermissions(Permisos.PRODUCTO_UPDATE)
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
