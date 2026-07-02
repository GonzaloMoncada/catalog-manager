import { Injectable } from '@nestjs/common';
import { ProductDbService } from './product-db/product-db.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductoRegionDto } from './dto/create-producto-region.dto';
import { UpdateProductoRegionDto } from './dto/update-producto-region.dto';

@Injectable()
export class ProductService {
  constructor(private readonly productDbService: ProductDbService) {}

  crearProducto(data: CreateProductDto) {
    return this.productDbService.crearProducto(data);
  }

  obtenerProductos(
    pagina?: number,
    limite?: number,
    buscar?: string,
    orderBy?: string,
    orderDir?: 'asc' | 'desc',
    estado?: string,
    categoria_id?: number,
  ) {
    return this.productDbService.obtenerProductos(
      pagina,
      limite,
      buscar,
      orderBy,
      orderDir,
      estado,
      categoria_id,
    );
  }

  obtenerProductoPorId(id: number) {
    return this.productDbService.obtenerProductoPorId(id);
  }

  actualizarProducto(id: number, data: UpdateProductDto) {
    return this.productDbService.actualizarProducto(id, data);
  }

  eliminarProducto(id: number) {
    return this.productDbService.eliminarProducto(id);
  }

  crearProductoRegion(productoId: number, data: CreateProductoRegionDto) {
    return this.productDbService.crearProductoRegion(productoId, data);
  }

  obtenerTodasLasRegiones(
    pagina?: number,
    limite?: number,
    buscar?: string,
    orderBy?: string,
    orderDir?: 'asc' | 'desc',
    estado?: string,
    region_id?: number,
    precio_min?: number,
    precio_max?: number,
    solo_ofertas?: boolean,
    categoria_id?: number,
  ) {
    return this.productDbService.obtenerTodasLasRegiones(
      pagina,
      limite,
      buscar,
      orderBy,
      orderDir,
      estado,
      region_id,
      precio_min,
      precio_max,
      solo_ofertas,
      categoria_id,
    );
  }

  obtenerRegionesDeProducto(
    productoId: number,
    pagina?: number,
    limite?: number,
    buscar?: string,
    orderBy?: string,
    orderDir?: 'asc' | 'desc',
  ) {
    return this.productDbService.obtenerRegionesDeProducto(
      productoId,
      pagina,
      limite,
      buscar,
      orderBy,
      orderDir,
    );
  }

  actualizarProductoRegion(codigo: string, data: UpdateProductoRegionDto) {
    return this.productDbService.actualizarProductoRegion(codigo, data);
  }

  eliminarProductoRegion(codigo: string) {
    return this.productDbService.eliminarProductoRegion(codigo);
  }
}
