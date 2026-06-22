/**
 * Test de login - Pasos completos (plain JS, ejecutar con node)
 *
 * Requisito: servidor corriendo en localhost:3101 (pnpm start:dev)
 */
const BASE = 'http://localhost:3101';

function createCookieJar() {
  const cookies = new Map();
  return {
    cookies,
    setFromHeaders(headers) {
      const setCookie = headers.get('set-cookie');
      if (setCookie) {
        for (const part of setCookie.split(/,(?=\s*\S+=)/)) {
          const [nameValue] = part.split(';');
          const [name, ...rest] = nameValue.split('=');
          cookies.set(name.trim(), rest.join('='));
        }
      }
    },
    getCookieHeader() {
      return Array.from(cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    },
  };
}

async function main() {
  const jar = createCookieJar();

  console.log('========================================');
  console.log('  TEST DE LOGIN - Flujo completo');
  console.log('========================================\n');

  // ─── Paso 1: Obtener CSRF token ───
  console.log('1. GET /csrf-token');
  let res = await fetch(`${BASE}/csrf-token`);
  jar.setFromHeaders(res.headers);
  const csrfToken = jar.cookies.get('csrf-token');
  console.log(`   Status: ${res.status}`);
  console.log(`   CSRF cookie: ${csrfToken ? 'RECIBIDO' : 'NO RECIBIDO'}`);
  console.log(`   Body: ${JSON.stringify(await res.json())}\n`);

  // ─── Paso 2: Login ───
  console.log('2. POST /auth/login (publico, exento CSRF, usa passport-local)');
  res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.getCookieHeader(),
    },
    body: JSON.stringify({
      username: 'test@example.com',
      password: 'Test1234!',
    }),
  });
  jar.setFromHeaders(res.headers);
  const body = await res.json();
  console.log(`   Status: ${res.status}`);
  console.log(`   Body: ${JSON.stringify(body)}`);
  if (body.two_factor_required) {
    console.log('   ⚠️  2FA requerido - el usuario tiene 2FA activo');
    console.log('   Para continuar, deshabilita 2FA o usa un usuario sin 2FA\n');
  }
  const accessToken = jar.cookies.get('access_token');
  console.log(`   access_token cookie: ${accessToken ? 'RECIBIDO (httpOnly)' : 'NO RECIBIDO'}\n`);

  // ─── Paso 3: Perfil ───
  console.log('3. GET /profile (requiere JWT en cookie)');
  const csrfValue = jar.cookies.get('csrf-token') ?? '';
  res = await fetch(`${BASE}/profile`, {
    headers: { Cookie: jar.getCookieHeader() },
  });
  const profileBody = await res.json();
  console.log(`   Status: ${res.status}`);
  console.log(`   Body: ${JSON.stringify(profileBody)}\n`);

  // ─── Paso 4: Endpoint protegido ───
  console.log('4. GET /users (requiere JWT + permiso USUARIO_READ)');
  res = await fetch(`${BASE}/users`, {
    headers: { Cookie: jar.getCookieHeader() },
  });
  console.log(`   Status: ${res.status}`);
  const usersBody = await res.json();
  console.log(`   Total usuarios: ${usersBody.total}`);
  console.log(`   Pagina: ${usersBody.pagina}/${usersBody.totalPaginas}\n`);

  // ─── Paso 5: Mutación con CSRF ───
  console.log('5. POST /category (requiere JWT + CSRF header + permiso CATEGORIA_CREATE)');
  res = await fetch(`${BASE}/category`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.getCookieHeader(),
      'x-csrf-token': csrfValue,
    },
    body: JSON.stringify({ nombre: 'Categoria de prueba' }),
  });
  console.log(`   Status: ${res.status}`);
  const catBody = await res.json();
  console.log(`   Body: ${JSON.stringify(catBody)}\n`);

  // ─── Paso 6: Logout ───
  console.log('6. POST /auth/logout (exento CSRF)');
  res = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: jar.getCookieHeader() },
  });
  jar.setFromHeaders(res.headers);
  console.log(`   Status: ${res.status}`);
  const logoutBody = await res.json();
  console.log(`   Body: ${JSON.stringify(logoutBody)}\n`);

  // ─── Paso 7: Verificar que el token ya no sirve ───
  console.log('7. GET /profile (despues de logout → debe dar 401)');
  res = await fetch(`${BASE}/profile`, {
    headers: { Cookie: jar.getCookieHeader() },
  });
  console.log(`   Status: ${res.status}\n`);

  // ─── Resumen ───
  console.log('========================================');
  console.log('  RESUMEN DEL FLUJO DE LOGIN');
  console.log('========================================');
  console.log('1. GET  /csrf-token        → cookie csrf-token (no httpOnly, JS la puede leer)');
  console.log('2. POST /auth/login        → cookie access_token (httpOnly, segura)');
  console.log('3. GET  /profile           → usa JWT de la cookie automaticamente');
  console.log('4. GET  /users             → endpoints protegidos usan cookie JWT');
  console.log('5. POST /category          → mutaciones necesitan header x-csrf-token');
  console.log('6. POST /auth/logout       → borra cookie + blacklistea token');
  console.log('7. GET  /profile           → 401 (token revocado)\n');
  console.log('Lo que el frontend debe guardar:');
  console.log('  - access_token → NADA, es httpOnly, el navegador la envia sola');
  console.log('  - csrf-token → leerla con JS y enviarla en header x-csrf-token');
  console.log('  - Perfil (roles, permisos) → store (Zustand/Context) para UI condicional');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
