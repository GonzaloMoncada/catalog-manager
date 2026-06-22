import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegistroActividadDto } from '../dto/create-registro-actividad.dto';
import { UpdateRegistroActividadDto } from '../dto/update-registro-actividad.dto';

const RELACIONES_REGISTRO_ACTIVIDAD = {
  usuario: {
    select: {
      id: true,
      nombre_usuario: true,
      correo: true,
      fecha_creacion: true,
      email_verified: true,
      image_url: true,
    },
  },
} as const;

@Injectable()
export class RegistroActividadesDbService {
  constructor(private readonly prisma: PrismaService) {}

  async crearRegistroActividad(data: CreateRegistroActividadDto) {
    return this.prisma.registro_actividades.create({
      data,
      include: RELACIONES_REGISTRO_ACTIVIDAD,
    });
  }

  async obtenerRegistrosActividades(
    pagina = 1,
    limite = 10,
    usuarioId?: number,
  ) {
    const saltar = (pagina - 1) * limite;
    const where = usuarioId ? { usuario_id: usuarioId } : {};

    const [datos, total] = await Promise.all([
      this.prisma.registro_actividades.findMany({
        where,
        skip: saltar,
        take: limite,
        include: RELACIONES_REGISTRO_ACTIVIDAD,
        orderBy: { marca_tiempo: 'desc' },
      }),
      this.prisma.registro_actividades.count({ where }),
    ]);

    return {
      datos,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerRegistroActividadPorId(id: number) {
    const registro = await this.prisma.registro_actividades.findUnique({
      where: { id },
      include: RELACIONES_REGISTRO_ACTIVIDAD,
    });

    if (!registro) {
      throw new NotFoundException(
        `Registro de actividad con id ${id} no encontrado`,
      );
    }

    return registro;
  }

  async actualizarRegistroActividad(
    id: number,
    data: UpdateRegistroActividadDto,
  ) {
    const registro = await this.prisma.registro_actividades.findUnique({
      where: { id },
    });

    if (!registro) {
      throw new NotFoundException(
        `Registro de actividad con id ${id} no encontrado`,
      );
    }

    return this.prisma.registro_actividades.update({
      where: { id },
      data,
      include: RELACIONES_REGISTRO_ACTIVIDAD,
    });
  }

  async eliminarRegistroActividad(id: number) {
    const registro = await this.prisma.registro_actividades.findUnique({
      where: { id },
    });

    if (!registro) {
      throw new NotFoundException(
        `Registro de actividad con id ${id} no encontrado`,
      );
    }

    return this.prisma.registro_actividades.delete({
      where: { id },
    });
  }
}
