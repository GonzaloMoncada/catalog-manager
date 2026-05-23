
import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from '@nestjs/cache-manager';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private cache: Cache,
  ) {
    super({
      jwtFromRequest: (req: Request) => req.cookies?.access_token ?? null,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SECRETJWT') ?? '',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const token = req.cookies?.access_token;
    if (token) {
      const isBlacklisted = await this.cache.get(`jwt:blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revocado');
      }
    }
    return { userId: payload.sub, correo: payload.correo };
  }
}
