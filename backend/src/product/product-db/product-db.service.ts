import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CreateProductoRegionDto } from '../dto/create-producto-region.dto';
import { UpdateProductoRegionDto } from '../dto/update-producto-region.dto';

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

  async obtenerProductos(
    pagina = 1,
    limite = 10,
    buscar?: string,
    orderBy?: string,
    orderDir: 'asc' | 'desc' = 'asc',
    estado?: string,
    categoria_id?: number,
  ) {
    const saltar = (pagina - 1) * limite;

    const where: any = {};

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' as const } },
        { codigo: { contains: buscar, mode: 'insensitive' as const } },
      ];
    }

    if (estado) {
      const estados = estado.split(',').map((e) => e.trim());
      where.estado = { in: estados };
    }

    if (categoria_id !== undefined) {
      where.categoria_id = categoria_id;
    }

    if (orderBy === 'estado') {
      const dir = orderDir === 'desc' ? 'DESC' : 'ASC';
      const rawOrder = `
        CASE producto.estado
          WHEN 'HABILITADO' THEN 1
          WHEN 'PENDIENTE' THEN 2
          WHEN 'DESHABILITADO' THEN 3
          WHEN 'DESHABILITADO_POR_PRECIO' THEN 4
          WHEN 'DESHABILITADO_POR_DISPERSION' THEN 5
        END ${dir}, producto.nombre ASC
      `;

      const total = await this.prisma.producto.count({ where });

      const whereClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 0;

      if (buscar) {
        paramIdx++;
        whereClauses.push(
          `(producto.nombre ILIKE '%' || $${paramIdx} || '%' OR producto.codigo ILIKE '%' || $${paramIdx} || '%')`,
        );
        params.push(buscar);
      }

      if (estado) {
        const estados = estado.split(',').map((e) => e.trim());
        const placeholders = estados.map(() => {
          paramIdx++;
          return `$${paramIdx}`;
        });
        whereClauses.push(`producto.estado IN (${placeholders.join(', ')})`);
        params.push(...estados);
      }

      if (categoria_id !== undefined) {
        paramIdx++;
        whereClauses.push(`producto.categoria_id = $${paramIdx}`);
        params.push(categoria_id);
      }

      const sqlWhere =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const ids = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT producto.id FROM producto
         ${sqlWhere}
         ORDER BY ${rawOrder}
         LIMIT ${limite} OFFSET ${saltar}`,
        ...params,
      );

      if (ids.length === 0) {
        return {
          datos: [],
          total,
          pagina,
          limite,
          totalPaginas: Math.ceil(total / limite),
        };
      }

      const idList = ids.map((i) => i.id);
      const productos = await this.prisma.producto.findMany({
        where: { id: { in: idList } },
        include: RELACIONES_PRODUCTO,
      });

      const idMap = new Map(ids.map((i, idx) => [i.id, idx]));
      productos.sort((a, b) => (idMap.get(a.id) ?? 0) - (idMap.get(b.id) ?? 0));

      return {
        datos: productos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      };
    }

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        skip: saltar,
        take: limite,
        where,
        orderBy: orderBy
          ? [{ [orderBy]: orderDir }, { nombre: 'asc' }]
          : [{ nombre: 'asc' }],
        include: RELACIONES_PRODUCTO,
      }),
      this.prisma.producto.count({ where }),
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
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto con id ${productoId} no encontrado`,
      );
    }
    const { producto_id: _, ...datosRegion } = data;
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

  async obtenerTodasLasRegiones(
    pagina = 1,
    limite = 10,
    buscar?: string,
    orderBy?: string,
    orderDir: 'asc' | 'desc' = 'asc',
    estado?: string,
    region_id?: number,
    precio_min?: number,
    precio_max?: number,
  ) {
    const saltar = (pagina - 1) * limite;

    const where: any = {};

    if (buscar) {
      where.OR = [
        { codigo: { contains: buscar, mode: 'insensitive' as const } },
        {
          producto: {
            nombre: { contains: buscar, mode: 'insensitive' as const },
          },
        },
        {
          producto: {
            codigo: { contains: buscar, mode: 'insensitive' as const },
          },
        },
        {
          region: {
            nombre: { contains: buscar, mode: 'insensitive' as const },
          },
        },
      ];
    }

    if (estado) {
      const estados = estado.split(',').map((e) => e.trim());
      where.estado = { in: estados };
    }

    if (region_id !== undefined) {
      where.region_id = region_id;
    }

    if (precio_min !== undefined || precio_max !== undefined) {
      where.precio = {
        ...(precio_min !== undefined && { gte: precio_min }),
        ...(precio_max !== undefined && { lte: precio_max }),
      };
    }

    const include = {
      producto: {
        include: { Categorias: true },
      },
      region: true,
    } as const;

    if (orderBy === 'estado') {
      const dir = orderDir === 'desc' ? 'DESC' : 'ASC';
      const rawOrder = `
        CASE producto_region.estado
          WHEN 'HABILITADO' THEN 1
          WHEN 'PENDIENTE' THEN 2
          WHEN 'DESHABILITADO' THEN 3
          WHEN 'DESHABILITADO_POR_PRECIO' THEN 4
          WHEN 'DESHABILITADO_POR_DISPERSION' THEN 5
        END ${dir}, producto_region.codigo ASC
      `;

      const total = await this.prisma.producto_region.count({ where });

      const whereClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 0;

      if (buscar) {
        paramIdx++;
        whereClauses.push(
          `(producto_region.codigo ILIKE '%' || $${paramIdx} || '%' OR p.nombre ILIKE '%' || $${paramIdx} || '%' OR p.codigo ILIKE '%' || $${paramIdx} || '%' OR r.nombre ILIKE '%' || $${paramIdx} || '%')`,
        );
        params.push(buscar);
      }

      if (estado) {
        const estados = estado.split(',').map((e) => e.trim());
        const placeholders = estados.map(() => {
          paramIdx++;
          return `$${paramIdx}`;
        });
        whereClauses.push(
          `producto_region.estado IN (${placeholders.join(', ')})`,
        );
        params.push(...estados);
      }

      if (region_id !== undefined) {
        paramIdx++;
        whereClauses.push(`producto_region.region_id = $${paramIdx}`);
        params.push(region_id);
      }

      if (precio_min !== undefined) {
        paramIdx++;
        whereClauses.push(`producto_region.precio >= $${paramIdx}`);
        params.push(precio_min);
      }

      if (precio_max !== undefined) {
        paramIdx++;
        whereClauses.push(`producto_region.precio <= $${paramIdx}`);
        params.push(precio_max);
      }

      const sqlWhere =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const codigos = await this.prisma.$queryRawUnsafe<{ codigo: string }[]>(
        `SELECT producto_region.codigo FROM producto_region
         JOIN producto p ON p.id = producto_region.producto_id
         JOIN region r ON r.id = producto_region.region_id
         ${sqlWhere}
         ORDER BY ${rawOrder}
         LIMIT ${limite} OFFSET ${saltar}`,
        ...params,
      );

      if (codigos.length === 0) {
        return {
          datos: [],
          total,
          pagina,
          limite,
          totalPaginas: Math.ceil(total / limite),
        };
      }

      const codigoList = codigos.map((c) => c.codigo);
      const datos = await this.prisma.producto_region.findMany({
        where: { codigo: { in: codigoList } },
        include,
      });

      const codigoMap = new Map(codigos.map((c, idx) => [c.codigo, idx]));
      datos.sort(
        (a, b) =>
          (codigoMap.get(a.codigo) ?? 0) - (codigoMap.get(b.codigo) ?? 0),
      );

      return {
        datos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      };
    }

    let orderByClause: any = undefined;
    if (orderBy === 'region') {
      orderByClause = { region: { nombre: orderDir } };
    } else if (orderBy === 'producto') {
      orderByClause = { producto: { nombre: orderDir } };
    } else if (orderBy) {
      orderByClause = [{ [orderBy]: orderDir }, { codigo: 'asc' as const }];
    } else {
      orderByClause = [{ codigo: 'asc' as const }];
    }

    const [datos, total] = await Promise.all([
      this.prisma.producto_region.findMany({
        where,
        skip: saltar,
        take: limite,
        orderBy: orderByClause,
        include,
      }),
      this.prisma.producto_region.count({ where }),
    ]);

    return {
      datos,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerRegionesDeProducto(
    productoId: number,
    pagina = 1,
    limite = 10,
    buscar?: string,
    orderBy?: string,
    orderDir: 'asc' | 'desc' = 'asc',
  ) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto con id ${productoId} no encontrado`,
      );
    }

    const saltar = (pagina - 1) * limite;

    const where: Record<string, unknown> = {
      producto_id: productoId,
      ...(buscar && {
        OR: [
          {
            codigo: { contains: buscar, mode: 'insensitive' },
          },
          {
            region: {
              nombre: { contains: buscar, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    if (orderBy === 'estado') {
      const dir = orderDir === 'desc' ? 'DESC' : 'ASC';
      const rawOrder = `
        CASE producto_region.estado
          WHEN 'HABILITADO' THEN 1
          WHEN 'PENDIENTE' THEN 2
          WHEN 'DESHABILITADO' THEN 3
          WHEN 'DESHABILITADO_POR_PRECIO' THEN 4
          WHEN 'DESHABILITADO_POR_DISPERSION' THEN 5
        END ${dir}, producto_region.codigo ASC
      `;

      const total = await this.prisma.producto_region.count({ where });

      const whereClauses: string[] = [`producto_region.producto_id = $1`];
      const params: any[] = [productoId];
      let paramIdx = 1;

      if (buscar) {
        paramIdx++;
        whereClauses.push(
          `(producto_region.codigo ILIKE '%' || $${paramIdx} || '%' OR r.nombre ILIKE '%' || $${paramIdx} || '%')`,
        );
        params.push(buscar);
      }

      const sqlWhere = `WHERE ${whereClauses.join(' AND ')}`;

      const codigos = await this.prisma.$queryRawUnsafe<{ codigo: string }[]>(
        `SELECT producto_region.codigo FROM producto_region
         JOIN region r ON r.id = producto_region.region_id
         ${sqlWhere}
         ORDER BY ${rawOrder}
         LIMIT ${limite} OFFSET ${saltar}`,
        ...params,
      );

      if (codigos.length === 0) {
        return {
          datos: [],
          total,
          pagina,
          limite,
          totalPaginas: Math.ceil(total / limite),
        };
      }

      const codigoList = codigos.map((c) => c.codigo);
      const datos = await this.prisma.producto_region.findMany({
        where: { codigo: { in: codigoList } },
        include: { region: true },
      });

      const codigoMap = new Map(codigos.map((c, idx) => [c.codigo, idx]));
      datos.sort(
        (a, b) =>
          (codigoMap.get(a.codigo) ?? 0) - (codigoMap.get(b.codigo) ?? 0),
      );

      return {
        datos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      };
    }

    let orderByClause: any = undefined;
    if (orderBy === 'region') {
      orderByClause = { region: { nombre: orderDir } };
    } else if (orderBy) {
      orderByClause = [{ [orderBy]: orderDir }, { codigo: 'asc' as const }];
    }

    const [datos, total] = await Promise.all([
      this.prisma.producto_region.findMany({
        where,
        skip: saltar,
        take: limite,
        orderBy: orderByClause,
        include: { region: true },
      }),
      this.prisma.producto_region.count({ where }),
    ]);

    return {
      datos,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async actualizarProductoRegion(
    codigo: string,
    data: UpdateProductoRegionDto,
  ) {
    const productoRegion = await this.prisma.producto_region.findUnique({
      where: { codigo },
    });
    if (!productoRegion) {
      throw new NotFoundException(
        `ProductoRegion con codigo ${codigo} no encontrado`,
      );
    }
    const { producto_id: _, ...datosActualizables } = data;
    return this.prisma.producto_region.update({
      where: { codigo },
      data: datosActualizables,
      include: { region: true },
    });
  }

  async eliminarProductoRegion(codigo: string) {
    const productoRegion = await this.prisma.producto_region.findUnique({
      where: { codigo },
    });
    if (!productoRegion) {
      throw new NotFoundException(
        `ProductoRegion con codigo ${codigo} no encontrado`,
      );
    }
    return this.prisma.producto_region.delete({
      where: { codigo },
    });
  }
}
