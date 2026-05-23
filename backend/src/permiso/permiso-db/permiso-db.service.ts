import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePermisoDto } from '../dto/create-permiso.dto';
import { UpdatePermisoDto } from '../dto/update-permiso.dto';

const RELACIONES_PERMISO = {
  roles_permisos: {
    include: {
      tipo_rol: true,
    },
  },
} as const;

@Injectable()
export class PermisoDbService {
  constructor(private readonly prisma: PrismaService) {}

  async crearPermiso(data: CreatePermisoDto) {
    return this.prisma.permisos.create({
      data,
      include: RELACIONES_PERMISO,
    });
  }

  async obtenerPermisos(pagina = 1, limite = 10) {
    const saltar = (pagina - 1) * limite;

    const [datos, total] = await Promise.all([
      this.prisma.permisos.findMany({
        skip: saltar,
        take: limite,
        include: RELACIONES_PERMISO,
      }),
      this.prisma.permisos.count(),
    ]);

    return {
      datos,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerPermisoPorId(id: number) {
    const permiso = await this.prisma.permisos.findUnique({
      where: { id },
      include: RELACIONES_PERMISO,
    });

    if (!permiso) {
      throw new NotFoundException(`Permiso con id ${id} no encontrado`);
    }

    return permiso;
  }

  async actualizarPermiso(id: number, data: UpdatePermisoDto) {
    const permiso = await this.prisma.permisos.findUnique({ where: { id } });

    if (!permiso) {
      throw new NotFoundException(`Permiso con id ${id} no encontrado`);
    }

    return this.prisma.permisos.update({
      where: { id },
      data,
      include: RELACIONES_PERMISO,
    });
  }

  async eliminarPermiso(id: number) {
    const permiso = await this.prisma.permisos.findUnique({ where: { id } });

    if (!permiso) {
      throw new NotFoundException(`Permiso con id ${id} no encontrado`);
    }

    return this.prisma.permisos.delete({
      where: { id },
    });
  }
}
