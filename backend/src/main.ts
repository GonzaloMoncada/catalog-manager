import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';

async function bootstrap() {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  app.use(cookieParser());

  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => 'csrf-secreto-desarrollo',
    cookieName: 'csrf-token',
    cookieOptions: {
      httpOnly: false,
      sameSite: 'strict',
      secure: false,
      path: '/',
    },
    getSessionIdentifier: (req) => req.cookies?.access_token ?? 'anonymous',
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token']?.toString() ?? null,
    skipCsrfProtection: (req) => req.path === '/auth/login' || req.path === '/auth/logout',
  });

  app.use(doubleCsrfProtection);

  await app.listen(port);
  console.log(`Server is running on port ${port}`);
}
bootstrap();
