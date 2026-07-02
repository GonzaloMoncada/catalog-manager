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
import { UpdateProductoRegionDto } from './dto/update-producto-region.dto';
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
    @Query('buscar') buscar?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: string,
    @Query('estado') estado?: string,
    @Query('categoria_id') categoria_id?: string,
  ) {
    return this.productService.obtenerProductos(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
      buscar,
      orderBy,
      orderDir as 'asc' | 'desc',
      estado,
      categoria_id ? +categoria_id : undefined,
    );
  }

  @Public()
  @Get('regiones')
  obtenerTodasLasRegiones(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Query('buscar') buscar?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: string,
    @Query('estado') estado?: string,
    @Query('region_id') region_id?: string,
    @Query('precio_min') precio_min?: string,
    @Query('precio_max') precio_max?: string,
    @Query('solo_ofertas') solo_ofertas?: string,
    @Query('categoria_id') categoria_id?: string,
  ) {
    return this.productService.obtenerTodasLasRegiones(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
      buscar,
      orderBy,
      orderDir as 'asc' | 'desc',
      estado,
      region_id ? +region_id : undefined,
      precio_min ? +precio_min : undefined,
      precio_max ? +precio_max : undefined,
      solo_ofertas === 'true',
      categoria_id ? +categoria_id : undefined,
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

  @Public()
  @Get(':id/region')
  obtenerRegionesDeProducto(
    @Param('id') id: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Query('buscar') buscar?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: string,
  ) {
    return this.productService.obtenerRegionesDeProducto(
      +id,
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
      buscar,
      orderBy,
      orderDir as 'asc' | 'desc',
    );
  }

  @RequirePermissions(Permisos.PRODUCTO_UPDATE)
  @Patch(':id/region/:codigo')
  actualizarProductoRegion(
    @Param('codigo') codigo: string,
    @Body() updateProductoRegionDto: UpdateProductoRegionDto,
  ) {
    return this.productService.actualizarProductoRegion(
      codigo,
      updateProductoRegionDto,
    );
  }

  @RequirePermissions(Permisos.PRODUCTO_DELETE)
  @Delete(':id/region/:codigo')
  eliminarProductoRegion(@Param('codigo') codigo: string) {
    return this.productService.eliminarProductoRegion(codigo);
  }
}
