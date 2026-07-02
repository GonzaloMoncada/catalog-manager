import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
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
      throw new NotFoundException(
        `El correo electrónico que ingresaste no está conectado a una cuenta.`,
      );
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

  async habilitar2fa(usuarioId: number, secret: string) {
    await this.prisma.usuarios.update({
      where: { id: usuarioId },
      data: { two_factor_secret: secret },
    });
  }

  async deshabilitar2fa(usuarioId: number) {
    await this.prisma.usuarios.update({
      where: { id: usuarioId },
      data: { two_factor_secret: null },
    });
  }

  async confirmarCuenta(usuarioId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usuarioId} no encontrado`);
    }
    if (usuario.estado !== 'pendiente') {
      throw new BadRequestException('La cuenta ya fue confirmada previamente');
    }
    await this.prisma.usuarios.update({
      where: { id: usuarioId },
      data: { estado: 'confirmado' },
    });
  }

  async obtenerPerfilBasico(usuarioId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
      select: { nombre_usuario: true, image_url: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usuarioId} no encontrado`);
    }

    return usuario;
  }

  async cambiarContrasena(
    usuarioId: number,
    contrasenaActual: string,
    contrasenaNueva: string,
  ) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usuarioId} no encontrado`);
    }
    if (usuario.estado !== 'pendiente') {
      throw new BadRequestException(
        'Solo puedes cambiar la contraseña si tu cuenta está en estado pendiente',
      );
    }
    const coincide = await bcrypt.compare(contrasenaActual, usuario.contrasena);
    if (!coincide) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    const hash = await bcrypt.hash(contrasenaNueva, 10);
    await this.prisma.usuarios.update({
      where: { id: usuarioId },
      data: { contrasena: hash },
    });
  }

  async actualizarPerfil(usuarioId: number, data: UpdateProfileDto) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usuarioId} no encontrado`);
    }
    if (data.nombre_usuario && data.nombre_usuario !== usuario.nombre_usuario) {
      const existente = await this.prisma.usuarios.findUnique({
        where: { nombre_usuario: data.nombre_usuario },
      });
      if (existente) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
    }
    return this.prisma.usuarios.update({
      where: { id: usuarioId },
      data,
      select: { nombre_usuario: true, image_url: true },
    });
  }
}
