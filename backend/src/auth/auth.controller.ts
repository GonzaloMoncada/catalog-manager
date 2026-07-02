import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Res,
  Body,
  Delete,
  Patch,
} from '@nestjs/common';
import type { Response } from 'express';
import { Cache } from '@nestjs/cache-manager';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { SkipAudit } from 'src/registro-actividades/audit.decorator';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { UsersService } from 'src/users/users.service';
import { UpdateProfileDto } from 'src/users/dto/update-profile.dto';

@SkipAudit()
@UseGuards(JwtAuthGuard)
@Controller()
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private cache: Cache,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const result = this.authService.login(req.user);
    if (result.access_token) {
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      });
      req.cookies.access_token = result.access_token;
      req.csrfToken();
      return { ok: true };
    }
    return result;
  }

  @Public()
  @Post('auth/verify-2fa')
  async verify2fa(
    @Request() req,
    @Body() dto: Verify2faDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const access_token = await this.authService.verify2faAndLogin(
      dto.token_2fa,
      dto.codigo,
    );
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });
    req.cookies.access_token = access_token;
    req.csrfToken();
    return { ok: true };
  }

  @Get('profile')
  async getProfile(@Request() req) {
    const { userId, correo } = req.user as { userId: number; correo: string };
    const [cacheKey, perfilBasico] = await Promise.all([
      (async () => {
        const key = `user:${userId}:permisos`;
        let cached = await this.cache.get<{
          isAdmin: boolean;
          permisos: string[];
        }>(key);
        if (!cached) {
          const roles = await this.usersService.obtenerRolesDeUsuario(userId);
          const isAdmin = roles.some(
            (r) => r.tipo_rol.nombre.toLowerCase() === 'administrador',
          );
          const permisos = roles.flatMap((r) =>
            r.tipo_rol.roles_permisos.map((rp) => rp.permiso.nombre),
          );
          cached = { isAdmin, permisos };
          await this.cache.set(key, cached, 300_000);
        }
        return cached;
      })(),
      this.usersService.obtenerPerfilBasico(userId),
    ]);
    return {
      userId,
      correo,
      nombre_usuario: perfilBasico.nombre_usuario,
      image_url: perfilBasico.image_url,
      isAdmin: cacheKey.isAdmin,
      permisos: cacheKey.permisos,
    };
  }

  @Patch('profile')
  actualizarPerfil(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.actualizarPerfil(req.user.userId, dto);
  }

  @Post('auth/logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.access_token;
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie('access_token');
    return { ok: true };
  }
  @Post('auth/2fa/generate')
  generate2fa(@Request() req) {
    return this.authService.generate2faSecret(req.user.correo);
  }

  @Post('auth/2fa/enable')
  async enable2fa(@Request() req, @Body() dto: Enable2faDto) {
    await this.authService.enable2fa(req.user.userId, dto.secret, dto.codigo);
    return { ok: true };
  }

  @Delete('auth/2fa')
  async disable2fa(@Request() req, @Body('codigo') codigo: string) {
    await this.authService.disable2fa(req.user.userId, codigo);
    return { ok: true };
  }

  @Public()
  @Get('csrf-token')
  getCsrfToken(@Request() req) {
    const token = req.csrfToken();
    return { ok: true, token };
  }
}
