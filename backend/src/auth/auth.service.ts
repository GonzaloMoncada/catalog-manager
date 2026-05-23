import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private jwtService: JwtService,
        private cache: Cache,
    ) { }

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
    login(user: any): string {
    const payload = { correo: user.correo, sub: user.id };
    return this.jwtService.sign(payload);
  }
    async logout(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token) as any;
    const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 43200;
    await this.cache.set(`jwt:blacklist:${token}`, '1', expiresIn * 1000);
  }
}
