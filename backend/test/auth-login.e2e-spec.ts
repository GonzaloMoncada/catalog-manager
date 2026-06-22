import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';

describe('Auth Login (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let agente: request.Agent;

  const USUARIO_TEST = {
    nombre_usuario: 'e2e_test_user',
    correo: 'e2e_test@example.com',
    contrasena: 'Test1234!',
  };

  let usuarioId: bigint;
  let rolId: bigint;
  const permisoIds: bigint[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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
      getCsrfTokenFromRequest: (req) =>
        req.headers['x-csrf-token']?.toString() ?? null,
      skipCsrfProtection: (req) =>
        req.path === '/auth/login' ||
        req.path === '/auth/logout' ||
        req.path === '/auth/verify-2fa',
    });

    app.use(doubleCsrfProtection);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();

    prisma = app.get(PrismaService);
    agente = request.agent(app.getHttpServer());

    const hashedPassword = await bcrypt.hash(USUARIO_TEST.contrasena, 10);

    const permisoNombres = [
      'USUARIO_CREATE',
      'USUARIO_READ',
      'USUARIO_UPDATE',
      'USUARIO_DELETE',
      'ROL_CREATE',
      'ROL_READ',
      'ROL_UPDATE',
      'ROL_DELETE',
      'PERMISO_READ',
      'PRODUCTO_READ',
      'PRODUCTO_CREATE',
      'CATEGORIA_READ',
      'REGION_READ',
      'OFERTA_READ',
    ];

    for (const nombre of permisoNombres) {
      const permiso = await prisma.permisos.create({ data: { nombre } });
      permisoIds.push(permiso.id);
    }

    const rol = await prisma.tipos_roles.create({
      data: { nombre: 'e2e_admin_test' },
    });
    rolId = rol.id;

    for (const permisoId of permisoIds) {
      await prisma.roles_permisos.create({
        data: { rol_id: rolId, permiso_id: permisoId },
      });
    }

    const usuario = await prisma.usuarios.create({
      data: {
        nombre_usuario: USUARIO_TEST.nombre_usuario,
        correo: USUARIO_TEST.correo,
        contrasena: hashedPassword,
        estado: 'confirmado',
      },
    });
    usuarioId = usuario.id;
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };

    await prisma.usuarios_roles.create({
      data: { usuario_id: usuarioId, rol_id: rolId },
    });
  });

  afterAll(async () => {
    await prisma.usuarios_roles.deleteMany({
      where: { usuario_id: usuarioId },
    });
    await prisma.usuarios.delete({ where: { id: usuarioId } });
    await prisma.roles_permisos.deleteMany({
      where: { rol_id: rolId },
    });
    await prisma.tipos_roles.delete({ where: { id: rolId } });
    for (const id of permisoIds) {
      await prisma.permisos.delete({ where: { id } }).catch(() => {});
    }
    await app.close();
  });

  it('Paso 1: GET /csrf-token → devuelve ok + cookie csrf-token', async () => {
    const res = await agente.get('/csrf-token').expect(200);
    expect(res.body.ok).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const csrfCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
      (c: string) => c.startsWith('csrf-token='),
    );
    expect(csrfCookie).toBeDefined();
  });

  it('Paso 2: POST /auth/login → devuelve ok + cookie access_token httpOnly', async () => {
    const res = await agente
      .post('/auth/login')
      .send({
        username: USUARIO_TEST.correo,
        password: USUARIO_TEST.contrasena,
      })
      .expect(201);

    expect(res.body.ok).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const accessCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
      (c: string) => c.startsWith('access_token='),
    );
    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain('HttpOnly');
  });

  it('Paso 3: GET /profile → devuelve datos del usuario autenticado', async () => {
    const res = await agente.get('/profile').expect(200);
    expect(res.body.correo).toBe(USUARIO_TEST.correo);
    expect(res.body.userId).toBeDefined();
  });

  it('Paso 4: GET /users → devuelve lista paginada (requiere USUARIO_READ)', async () => {
    const res = await agente.get('/users').expect(200);
    expect(res.body.datos).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.pagina).toBeDefined();
    expect(res.body.totalPaginas).toBeDefined();
  });

  it('Paso 5: POST /auth/logout → cierra sesion y blacklistea el token', async () => {
    const res = await agente.post('/auth/logout').expect(201);
    expect(res.body.ok).toBe(true);
  });

  it('Paso 6: GET /profile despues de logout → 401', async () => {
    await agente.get('/profile').expect(401);
  });
});
