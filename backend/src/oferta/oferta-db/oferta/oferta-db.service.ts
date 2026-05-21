import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOfertaDto } from '../../dto/create-oferta.dto';
import { UpdateOfertaDto } from '../../dto/update-oferta.dto';

const RELACIONES_OFERTA = {
  productos: {
    include: {
      region: true,
    },
  },
} as const;

@Injectable()
export class OfertaDbService {
  constructor(private readonly prisma: PrismaService) {}

  async crearOferta(data: CreateOfertaDto) {
    const { productos, ...datosOferta } = data;
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

  async obtenerOfertas(pagina = 1, limite = 10) {
    const saltar = (pagina - 1) * limite;

    const [ofertas, total] = await Promise.all([
      this.prisma.oferta.findMany({
        skip: saltar,
        take: limite,
        include: RELACIONES_OFERTA,
      }),
      this.prisma.oferta.count(),
    ]);

    return {
      datos: ofertas,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
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

  async actualizarOferta(id: number, data: UpdateOfertaDto) {
    const oferta = await this.prisma.oferta.findUnique({ where: { id } });

    if (!oferta) {
      throw new NotFoundException(`Oferta con id ${id} no encontrada`);
    }

    const { productos, ...datosOferta } = data;

    return this.prisma.oferta.update({
      where: { id },
      data: datosOferta,
      include: RELACIONES_OFERTA,
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
