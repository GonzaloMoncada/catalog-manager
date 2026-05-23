import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Cache } from '@nestjs/cache-manager';
import { TwoFactorService } from './two-factor.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
    private cache: Cache,
    private twoFactorService: TwoFactorService,
  ) {}

  async validateUser(mail: string, contrasena: string): Promise<any> {
    const user = await this.usersService.obtenerUsuarioPorCorreo(mail);
    if (user) {
      const passwordMatch = await bcrypt.compare(contrasena, user.contrasena);
      if (passwordMatch) {
        const { contrasena, ...result } = user;
        return result;
      }
    }
    return null;
  }

  login(user: any): {
    access_token?: string;
    two_factor_required?: boolean;
    token_2fa?: string;
  } {
    if (user.two_factor_secret) {
      const payload = {
        correo: user.correo,
        sub: user.id,
        type: '2fa_pending',
      };
      const token2fa = this.jwtService.sign(payload, { expiresIn: '5m' });
      return { two_factor_required: true, token_2fa: token2fa };
    }
    const payload = { correo: user.correo, sub: user.id };
    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }

  async verify2faAndLogin(token2fa: string, codigo: string): Promise<string> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token2fa);
    } catch {
      throw new UnauthorizedException('Token 2FA inválido o expirado');
    }
    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Token no válido para verificación 2FA');
    }
    const user = await this.usersService.obtenerUsuarioPorId(payload.sub);
    if (!user.two_factor_secret) {
      throw new UnauthorizedException('2FA no configurado para este usuario');
    }
    const isValid = await this.twoFactorService.verifyToken(
      user.two_factor_secret,
      codigo,
    );
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }
    const newPayload = { correo: user.correo, sub: user.id };
    return this.jwtService.sign(newPayload);
  }

  generate2faSecret(correo: string) {
    const secret = this.twoFactorService.generateSecret();
    const qrCodeUrl = this.twoFactorService.generateQrCodeUrl(correo, secret);
    return { secret, qrCodeUrl };
  }

  async enable2fa(
    userId: number,
    secret: string,
    codigo: string,
  ): Promise<void> {
    const user = await this.usersService.obtenerUsuarioPorId(userId);
    if (user.two_factor_secret) {
      throw new ConflictException('2FA ya está habilitado para este usuario');
    }
    const isValid = await this.twoFactorService.verifyToken(secret, codigo);
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }
    await this.usersService.habilitar2fa(userId, secret);
  }

  async disable2fa(userId: number, codigo: string): Promise<void> {
    const user = await this.usersService.obtenerUsuarioPorId(userId);
    if (!user.two_factor_secret) {
      throw new BadRequestException('2FA no está habilitado para este usuario');
    }
    const isValid = await this.twoFactorService.verifyToken(
      user.two_factor_secret,
      codigo,
    );
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }
    await this.usersService.deshabilitar2fa(userId);
  }

  async logout(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token);
    const expiresIn = decoded?.exp
      ? decoded.exp - Math.floor(Date.now() / 1000)
      : 43200;
    await this.cache.set(`jwt:blacklist:${token}`, '1', expiresIn * 1000);
  }
}
