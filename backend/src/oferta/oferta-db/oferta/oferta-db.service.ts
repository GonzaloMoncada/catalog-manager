import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOfertaDto } from '../../dto/create-oferta.dto';
import { UpdateOfertaDto } from '../../dto/update-oferta.dto';

const RELACIONES_OFERTA = {
  productos: {
    include: {
      region: {
        include: {
          producto: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class OfertaDbService {
  constructor(private readonly prisma: PrismaService) {}

  private async validarProductosActivosUnicos(
    regionIds: string[],
    ofertaIdExcluir?: number,
  ) {
    const conflicto = await this.prisma.oferta_producto.findFirst({
      where: {
        region_id: { in: regionIds },
        ...(ofertaIdExcluir !== undefined
          ? {
              oferta: { estado: 'ACTIVA', id: { not: ofertaIdExcluir } },
            }
          : { oferta: { estado: 'ACTIVA' } }),
      },
      select: { oferta: { select: { nombre: true } } },
    });

    if (conflicto) {
      throw new ConflictException(
        `Uno o mas productos ya pertenecen a la oferta activa "${conflicto.oferta.nombre}"`,
      );
    }
  }

  async crearOferta(data: CreateOfertaDto) {
    const { productos, ...datosOferta } = data;
    const estado = datosOferta.estado ?? 'ACTIVA';

    if (estado === 'ACTIVA' && productos?.length) {
      await this.validarProductosActivosUnicos(
        productos.map((p) => p.region_id),
      );
    }

    return this.prisma.oferta.create({
      data: {
        ...datosOferta,
        ...(productos?.length && {
          productos: {
            create: productos,
          },
        }),
      },
      include: RELACIONES_OFERTA,
    });
  }

  async obtenerOfertas(
    pagina = 1,
    limite = 10,
    buscar?: string,
    estado?: string,
    orderBy = 'nombre',
    orderDir: 'asc' | 'desc' = 'asc',
  ) {
    const where = this.construirWhereOfertas(buscar, estado);
    const saltar = (pagina - 1) * limite;
    const orden = this.validarOrden(orderBy, orderDir);

    const [ofertas, total] = await Promise.all([
      this.prisma.oferta.findMany({
        where,
        skip: saltar,
        take: limite,
        orderBy: orden,
        include: RELACIONES_OFERTA,
      }),
      this.prisma.oferta.count({ where }),
    ]);

    return {
      datos: ofertas,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerOfertasActivas(
    pagina = 1,
    limite = 10,
    buscar?: string,
    estado?: string,
    orderBy = 'nombre',
    orderDir: 'asc' | 'desc' = 'asc',
  ) {
    const ahora = new Date();
    const where = {
      ...this.construirWhereOfertas(buscar, estado),
      fecha_fin: { gte: ahora },
    };
    const saltar = (pagina - 1) * limite;
    const orden = this.validarOrden(orderBy, orderDir);

    const [ofertas, total] = await Promise.all([
      this.prisma.oferta.findMany({
        where,
        skip: saltar,
        take: limite,
        orderBy: orden,
        include: RELACIONES_OFERTA,
      }),
      this.prisma.oferta.count({ where }),
    ]);

    return {
      datos: ofertas,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  private construirWhereOfertas(buscar?: string, estado?: string) {
    const where: Record<string, unknown> = {};

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { descripcion: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    if (estado) {
      where.estado = { in: estado.split(',') };
    }

    return where;
  }

  private validarOrden(orderBy: string, orderDir: 'asc' | 'desc') {
    const camposValidos = [
      'id',
      'nombre',
      'descripcion',
      'fecha_inicio',
      'fecha_fin',
      'estado',
    ];

    return {
      [camposValidos.includes(orderBy) ? orderBy : 'nombre']: orderDir,
    };
  }

  async obtenerOfertaPorId(id: number) {
    const oferta = await this.prisma.oferta.findUnique({
      where: { id },
      include: RELACIONES_OFERTA,
    });

    if (!oferta) {
      throw new NotFoundException(`Oferta con id ${id} no encontrada`);
    }

    return oferta;
  }

  async obtenerOfertaActivaPorId(id: number) {
    const ahora = new Date();
    const oferta = await this.prisma.oferta.findUnique({
      where: { id, fecha_fin: { gte: ahora } },
      include: RELACIONES_OFERTA,
    });

    if (!oferta) {
      throw new NotFoundException(`Oferta con id ${id} no encontrada`);
    }

    return oferta;
  }

  async actualizarOferta(id: number, data: UpdateOfertaDto) {
    const oferta = await this.prisma.oferta.findUnique({ where: { id } });

    if (!oferta) {
      throw new NotFoundException(`Oferta con id ${id} no encontrada`);
    }

    const { productos, ...datosOferta } = data;
    const estadoFinal = datosOferta.estado ?? oferta.estado;

    if (estadoFinal === 'ACTIVA') {
      if (productos) {
        await this.validarProductosActivosUnicos(
          productos.map((p) => p.region_id),
          id,
        );
      } else if (
        datosOferta.estado === 'ACTIVA' &&
        oferta.estado !== 'ACTIVA'
      ) {
        const existentes = await this.prisma.oferta_producto.findMany({
          where: { oferta_id: id },
          select: { region_id: true },
        });

        if (existentes.length > 0) {
          await this.validarProductosActivosUnicos(
            existentes.map((p) => p.region_id),
            id,
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (productos) {
        await tx.oferta_producto.deleteMany({ where: { oferta_id: id } });

        if (productos.length > 0) {
          await tx.oferta_producto.createMany({
            data: productos.map((p) => ({
              oferta_id: id,
              region_id: p.region_id,
              precio: p.precio,
              estado: p.estado ?? 'PENDIENTE',
            })),
          });
        }
      }

      return tx.oferta.update({
        where: { id },
        data: datosOferta,
        include: RELACIONES_OFERTA,
      });
    });
  }

  async eliminarOferta(id: number) {
    const oferta = await this.prisma.oferta.findUnique({ where: { id } });

    if (!oferta) {
      throw new NotFoundException(`Oferta con id ${id} no encontrada`);
    }

    return this.prisma.oferta.delete({
      where: { id },
    });
  }
}
