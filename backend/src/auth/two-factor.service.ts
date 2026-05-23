import { Injectable } from '@nestjs/common';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

@Injectable()
export class TwoFactorService {
  private readonly totp: TOTP;

  constructor() {
    this.totp = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
    });
  }

  async verifyToken(secret: string, token: string): Promise<boolean> {
    const result = await this.totp.verify(token, {
      secret,
      epochTolerance: 1,
    } as any);
    return result.valid;
  }

  generateSecret(): string {
    return this.totp.generateSecret();
  }

  generateQrCodeUrl(email: string, secret: string, appName = 'TuApp'): string {
    return this.totp.toURI({ label: email, secret, issuer: appName });
  }
}
