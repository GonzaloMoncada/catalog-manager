
import { Controller, Request, Post, UseGuards, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class AuthController {
    constructor(private authService: AuthService) { }
    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('auth/login')
    async login(@Request() req, @Res({ passthrough: true }) res: Response) {
        const access_token = this.authService.login(req.user);
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
        });
        return { ok: true };
    }
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
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
    @Public()
    @Get('csrf-token')
    getCsrfToken(@Request() req, @Res({ passthrough: true }) res: Response) {
        req.csrfToken();
        return { ok: true };
    }
}



