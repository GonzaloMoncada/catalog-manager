import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Res,
  Body,
  Delete,
} from '@nestjs/common';
import type { Response } from 'express';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { SkipAudit } from 'src/registro-actividades/audit.decorator';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';

@SkipAudit()
@UseGuards(JwtAuthGuard)
@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

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
  async disable2fa(@Request() req) {
    await this.authService.disable2fa(req.user.userId);
    return { ok: true };
  }

  @Public()
  @Get('csrf-token')
  getCsrfToken(@Request() req, @Res({ passthrough: true }) res: Response) {
    req.csrfToken();
    return { ok: true };
  }
}
