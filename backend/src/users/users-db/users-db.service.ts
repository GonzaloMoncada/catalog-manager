import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';

const RELACIONES_USUARIO = {
  usuarios_roles: {
    include: {
      tipo_rol: true,
    },
  },
} as const;

@Injectable()
export class UsersDbService {
  constructor(private readonly prisma: PrismaService) {}

  async crearUsuario(data: CreateUserDto) {
    const contrasena = await bcrypt.hash(data.contrasena, 10);
    const usuario = await this.prisma.usuarios.create({
      data: { ...data, contrasena },
      include: RELACIONES_USUARIO,
    });
    const { contrasena: _, ...resultado } = usuario;
    return resultado;
  }

  async obtenerUsuarios(pagina = 1, limite = 10) {
    const saltar = (pagina - 1) * limite;

    const [datos, total] = await Promise.all([
      this.prisma.usuarios.findMany({
        skip: saltar,
        take: limite,
        include: RELACIONES_USUARIO,
      }),
      this.prisma.usuarios.count(),
    ]);

    return {
      datos: datos.map(({ contrasena, ...resto }) => resto),
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerUsuarioPorId(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      include: RELACIONES_USUARIO,
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    const { contrasena: _, ...resultado } = usuario;
    return resultado;
  }
  async obtenerUsuarioPorCorreo(correo: string) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { correo },
      include: RELACIONES_USUARIO,
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con correo ${correo} no encontrado`);
    }

    return usuario;
  }

  async actualizarUsuario(id: number, data: UpdateUserDto) {
    const usuario = await this.prisma.usuarios.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    if (data.contrasena) {
      data.contrasena = await bcrypt.hash(data.contrasena, 10);
    }

    const actualizado = await this.prisma.usuarios.update({
      where: { id },
      data,
      include: RELACIONES_USUARIO,
    });
    const { contrasena: _, ...resultado } = actualizado;
    return resultado;
  }

  async eliminarUsuario(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return this.prisma.usuarios.delete({
      where: { id },
    });
  }

  async asignarRolAUsuario(usuarioId: number, rolId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usuarioId} no encontrado`);
    }

    const rol = await this.prisma.tipos_roles.findUnique({
      where: { id: rolId },
    });
    if (!rol) {
      throw new NotFoundException(`Rol con id ${rolId} no encontrado`);
    }

    const existente = await this.prisma.usuarios_roles.findFirst({
      where: { usuario_id: usuarioId, rol_id: rolId },
    });

    if (existente) {
      throw new ConflictException('El rol ya está asignado a este usuario');
    }

    return this.prisma.usuarios_roles.create({
      data: {
        usuario_id: usuarioId,
        rol_id: rolId,
      },
      include: {
        tipo_rol: true,
      },
    });
  }

  async obtenerRolesDeUsuario(usuarioId: number) {
  const usuario = await this.prisma.usuarios.findUnique({
    where: { id: usuarioId },
  });

  if (!usuario) {
    throw new NotFoundException(`Usuario con id ${usuarioId} no encontrado`);
  }

  return this.prisma.usuarios_roles.findMany({
    where: { usuario_id: usuarioId },
    include: {
      tipo_rol: {
        include: {
          roles_permisos: {
            include: {
              permiso: true,
            },
          },
        },
      },
    },
  });
}

  async quitarRolDeUsuario(usuarioId: number, rolId: number) {
    const relacion = await this.prisma.usuarios_roles.findFirst({
      where: { usuario_id: usuarioId, rol_id: rolId },
    });

    if (!relacion) {
      throw new NotFoundException(
        `El rol ${rolId} no está asignado al usuario ${usuarioId}`,
      );
    }

    return this.prisma.usuarios_roles.delete({
      where: { id: relacion.id },
    });
  }
}
