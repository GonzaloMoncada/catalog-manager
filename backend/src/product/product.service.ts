import { Injectable } from '@nestjs/common';
import { ProductDbService } from './product-db/product-db.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductoRegionDto } from './dto/create-producto-region.dto';

@Injectable()
export class ProductService {
  constructor(private readonly productDbService: ProductDbService) {}

  crearProducto(data: CreateProductDto) {
    return this.productDbService.crearProducto(data);
  }

  obtenerProductos(pagina?: number, limite?: number) {
    return this.productDbService.obtenerProductos(pagina, limite);
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
}
