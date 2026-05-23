import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegionDto } from '../../dto/create-region.dto';
import { UpdateRegionDto } from '../../dto/update-region.dto';

const RELACIONES_REGION = {} as const;

@Injectable()
export class RegionDbService {
  constructor(private readonly prisma: PrismaService) {}

  async crearRegion(data: CreateRegionDto) {
    return this.prisma.region.create({
      data,
      include: RELACIONES_REGION,
    });
  }

  async obtenerRegiones(pagina = 1, limite = 10) {
    const saltar = (pagina - 1) * limite;

    const [regiones, total] = await Promise.all([
      this.prisma.region.findMany({
        skip: saltar,
        take: limite,
        include: RELACIONES_REGION,
      }),
      this.prisma.region.count(),
    ]);

    return {
      datos: regiones,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerRegionPorId(id: number) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: RELACIONES_REGION,
    });

    if (!region) {
      throw new NotFoundException(`Region con id ${id} no encontrada`);
    }

    return region;
  }

  async obtenerProductosPorRegion(regionId: number, pagina = 1, limite = 10) {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      throw new NotFoundException(`Region con id ${regionId} no encontrada`);
    }

    const saltar = (pagina - 1) * limite;

    const [datos, total] = await Promise.all([
      this.prisma.producto_region.findMany({
        where: { region_id: regionId },
        skip: saltar,
        take: limite,
        include: {
          producto: {
            include: { Categorias: true },
          },
        },
      }),
      this.prisma.producto_region.count({ where: { region_id: regionId } }),
    ]);

    return {
      datos,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async actualizarRegion(id: number, data: UpdateRegionDto) {
    const region = await this.prisma.region.findUnique({ where: { id } });

    if (!region) {
      throw new NotFoundException(`Region con id ${id} no encontrada`);
    }

    return this.prisma.region.update({
      where: { id },
      data,
      include: RELACIONES_REGION,
    });
  }

  async eliminarRegion(id: number) {
    const region = await this.prisma.region.findUnique({ where: { id } });

    if (!region) {
      throw new NotFoundException(`Region con id ${id} no encontrada`);
    }

    return this.prisma.region.delete({
      where: { id },
    });
  }
}
