import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AsignarRolDto } from './dto/asignar-rol.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';
import { AuditTable } from 'src/registro-actividades/audit.decorator';

@AuditTable('usuarios')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions(Permisos.USUARIO_CREATE)
  @Post()
  crearUsuario(@Body() createUserDto: CreateUserDto) {
    return this.usersService.crearUsuario(createUserDto);
  }

  @RequirePermissions(Permisos.USUARIO_READ)
  @Get()
  obtenerUsuarios(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.usersService.obtenerUsuarios(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @RequirePermissions(Permisos.USUARIO_READ)
  @Get(':id')
  obtenerUsuarioPorId(@Param('id') id: string) {
    return this.usersService.obtenerUsuarioPorId(+id);
  }

  @RequirePermissions(Permisos.USUARIO_UPDATE)
  @Patch(':id')
  actualizarUsuario(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.actualizarUsuario(+id, updateUserDto);
  }

  @RequirePermissions(Permisos.USUARIO_DELETE)
  @Delete(':id')
  eliminarUsuario(@Param('id') id: string) {
    return this.usersService.eliminarUsuario(+id);
  }

  @RequirePermissions(Permisos.USUARIO_UPDATE)
  @Post(':id/rol')
  asignarRolAUsuario(@Param('id') id: string, @Body() body: AsignarRolDto) {
    return this.usersService.asignarRolAUsuario(+id, body.rol_id);
  }

  @RequirePermissions(Permisos.USUARIO_READ)
  @Get(':id/rol')
  obtenerRolesDeUsuario(@Param('id') id: string) {
    return this.usersService.obtenerRolesDeUsuario(+id);
  }

  @RequirePermissions(Permisos.USUARIO_UPDATE)
  @Delete(':id/rol/:rolId')
  quitarRolDeUsuario(@Param('id') id: string, @Param('rolId') rolId: string) {
    return this.usersService.quitarRolDeUsuario(+id, +rolId);
  }
}
