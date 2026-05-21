import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CreateProductoRegionDto } from '../dto/create-producto-region.dto';

const RELACIONES_PRODUCTO = {
  Categorias: true,
  producto_regiones: {
    include: {
      region: true,
    },
  },
} as const;

@Injectable()
export class ProductDbService {
  constructor(private readonly prisma: PrismaService) {}

  //tabla producto y tabla producto_regiones
  async crearProducto(data: CreateProductDto) {
    const { regiones, categoria_id, ...datosProducto } = data;
    return this.prisma.producto.create({
      data: {
        ...datosProducto,
        ...(categoria_id !== undefined && {
          Categorias: { connect: { id: categoria_id } },
        }),
        ...(regiones?.length && {
          producto_regiones: {
            create: regiones,
          },
        }),
      },
      include: RELACIONES_PRODUCTO,
    });
  }

  async obtenerProductos(pagina = 1, limite = 10) {
    const saltar = (pagina - 1) * limite;

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        skip: saltar,
        take: limite,
        include: RELACIONES_PRODUCTO,
      }),
      this.prisma.producto.count(),
    ]);

    return {
      datos: productos,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerProductoPorId(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: RELACIONES_PRODUCTO,
    });

    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return producto;
  }

  async actualizarProducto(id: number, data: UpdateProductDto) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });

    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    const { regiones, ...datosProducto } = data;

    return this.prisma.producto.update({
      where: { id },
      data: datosProducto,
      include: RELACIONES_PRODUCTO,
    });
  }

  async eliminarProducto(id: number) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });

    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return this.prisma.producto.delete({
      where: { id },
    });
  }

  async crearProductoRegion(productoId: number, data: CreateProductoRegionDto) {
  // 1. Validar que el producto existe
  const producto = await this.prisma.producto.findUnique({ where: { id: productoId } });
  if (!producto) {
    throw new NotFoundException(`Producto con id ${productoId} no encontrado`);
  }
  // 2. Crear solo la relación producto_region
  const { producto_id, ...datosRegion } = data;
  return this.prisma.producto_region.create({
    data: {
      ...datosRegion,
      producto_id: productoId,
    },
    include: {
      region: true,
    },
  });
}
}
