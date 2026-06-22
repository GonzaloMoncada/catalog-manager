import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRolDto } from '../dto/create-rol.dto';
import { UpdateRolDto } from '../dto/update-rol.dto';

const RELACIONES_ROL = {
  roles_permisos: {
    include: {
      permiso: true,
    },
  },
} as const;

@Injectable()
export class RolDbService {
  constructor(private readonly prisma: PrismaService) {}

  async crearRol(data: CreateRolDto) {
    return this.prisma.tipos_roles.create({
      data,
      include: RELACIONES_ROL,
    });
  }

  async obtenerRoles(pagina = 1, limite = 10) {
    const saltar = (pagina - 1) * limite;

    const [datos, total] = await Promise.all([
      this.prisma.tipos_roles.findMany({
        skip: saltar,
        take: limite,
        include: RELACIONES_ROL,
      }),
      this.prisma.tipos_roles.count(),
    ]);

    return {
      datos,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerRolPorId(id: number) {
    const rol = await this.prisma.tipos_roles.findUnique({
      where: { id },
      include: RELACIONES_ROL,
    });

    if (!rol) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }

    return rol;
  }

  async actualizarRol(id: number, data: UpdateRolDto) {
    const rol = await this.prisma.tipos_roles.findUnique({ where: { id } });

    if (!rol) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }

    if (rol.nombre === 'Administrador') {
      throw new ForbiddenException(
        'El rol Administrador no puede ser modificado',
      );
    }

    return this.prisma.tipos_roles.update({
      where: { id },
      data,
      include: RELACIONES_ROL,
    });
  }

  async eliminarRol(id: number) {
    const rol = await this.prisma.tipos_roles.findUnique({ where: { id } });

    if (!rol) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }

    if (rol.nombre === 'Administrador') {
      throw new ForbiddenException(
        'El rol Administrador no puede ser eliminado',
      );
    }

    return this.prisma.tipos_roles.delete({
      where: { id },
    });
  }

  async asignarPermisoARol(rolId: number, permisoId: number) {
    const rol = await this.prisma.tipos_roles.findUnique({
      where: { id: rolId },
    });
    if (!rol) {
      throw new NotFoundException(`Rol con id ${rolId} no encontrado`);
    }

    const permiso = await this.prisma.permisos.findUnique({
      where: { id: permisoId },
    });
    if (!permiso) {
      throw new NotFoundException(`Permiso con id ${permisoId} no encontrado`);
    }

    const existente = await this.prisma.roles_permisos.findFirst({
      where: { rol_id: rolId, permiso_id: permisoId },
    });

    if (existente) {
      throw new ConflictException('El permiso ya está asignado a este rol');
    }

    return this.prisma.roles_permisos.create({
      data: {
        rol_id: rolId,
        permiso_id: permisoId,
      },
      include: {
        permiso: true,
      },
    });
  }

  async obtenerPermisosDeRol(rolId: number) {
    const rol = await this.prisma.tipos_roles.findUnique({
      where: { id: rolId },
    });
    if (!rol) {
      throw new NotFoundException(`Rol con id ${rolId} no encontrado`);
    }

    return this.prisma.roles_permisos.findMany({
      where: { rol_id: rolId },
      include: {
        permiso: true,
      },
    });
  }

  async quitarPermisoDeRol(rolId: number, permisoId: number) {
    const relacion = await this.prisma.roles_permisos.findFirst({
      where: { rol_id: rolId, permiso_id: permisoId },
    });

    if (!relacion) {
      throw new NotFoundException(
        `El permiso ${permisoId} no está asignado al rol ${rolId}`,
      );
    }

    return this.prisma.roles_permisos.delete({
      where: { id: relacion.id },
    });
  }
}
