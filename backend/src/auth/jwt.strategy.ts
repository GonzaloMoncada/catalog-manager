import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from '@nestjs/cache-manager';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private cache: Cache,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: (req: Request) => req.cookies?.access_token ?? null,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SECRETJWT') ?? '',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    if (payload.type) {
      throw new UnauthorizedException('Token no autorizado');
    }
    const token = req.cookies?.access_token;
    if (token) {
      const isBlacklisted = await this.cache.get(`jwt:blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revocado');
      }
    }
    const cacheKey = `user:${payload.sub}:estado`;
    let estado = await this.cache.get<string>(cacheKey);
    if (!estado) {
      const usuario = await this.usersService.obtenerUsuarioPorId(
        payload.sub,
      );
      estado = usuario.estado;
      await this.cache.set(cacheKey, estado, 300_000);
    }
    if (estado === 'deshabilitado') {
      throw new UnauthorizedException('Cuenta deshabilitada');
    }
    return { userId: payload.sub, correo: payload.correo };
  }
}
