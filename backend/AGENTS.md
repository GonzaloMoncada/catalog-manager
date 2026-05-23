# AGENTS.md — Arquitectura del Proyecto

## Stack Tecnológico

| Capa              | Tecnología                              |
| ----------------- | --------------------------------------- |
| Framework         | NestJS v11 (Express)                    |
| Lenguaje          | TypeScript 5.7                          |
| ORM               | Prisma v7                               |
| Base de datos     | PostgreSQL (Neon Serverless)            |
| Package Manager   | pnpm                                    |
| Validación        | class-validator + class-transformer     |
| Testing           | Jest + Supertest                        |

---

## Estructura del Proyecto

```
src/
├── main.ts                      # Bootstrap de la app
├── app.module.ts                # Módulo raíz (ConfigModule global + feature modules)
├── prisma/
│   ├── prisma.module.ts         # @Global() — expone PrismaService a toda la app
│   └── prisma.service.ts        # PrismaClient con adapter pg.Pool
├── generated/prisma/            # Cliente Prisma auto-generado (CJS)
├── product/                     # CRUD de productos + producto-region
├── category/                    # CRUD de categorías (jerarquía auto-referenciada)
├── oferta/                      # CRUD de ofertas + oferta-producto
├── region/                      # CRUD de regiones
└── auth/                        # [PLANIFICADO] Módulo de autenticación
```

## Patrón de Feature Modules

Cada módulo sigue una arquitectura de 3 capas:

```
Controller  →  Service  →  DbService (Prisma)
  (rutas)       (lógica)      (queries)
```

- **Controller**: Solo enrutamiento y delegación al Service.
- **Service**: Lógica de negocio, delega queries al DbService.
- **DbService**: Consultas Prisma puras. Aquí viven los `include`, paginación y constantes de relaciones.

DTOs se ubican en `./dto/`. Los Update DTOs extienden los Create DTOs vía `PartialType` de `@nestjs/mapped-types`.

### Ejemplo: `product/`

```
product/
├── product.module.ts
├── product.controller.ts       # POST/GET /product, GET/PATCH/DELETE /product/:id, POST /product/:id/region
├── product.service.ts          # Lógica de negocio
├── product-db/
│   └── product-db.service.ts   # Queries Prisma (include, paginación)
└── dto/
    ├── create-product.dto.ts
    ├── update-product.dto.ts
    ├── create-producto-region.dto.ts
    └── update-producto-region.dto.ts
```

---

## Modelo de Datos (Prisma)

5 modelos + 2 enums:

```
producto ──┐                    region
  id       │                    id
  nombre   │                    nombre
  imagenUrl│                    estado: estado_region
  categoria_id ─── categorias   │
            │       id          │
            │       nombre      │
            │       parent_id ──┘ (auto-ref)
            │
            └── producto_region
                  codigo (PK)
                  producto_id (FK)
                  region_id (FK)
                  precio
                  estado: estado_region
                        │
                        └── oferta_producto
                              id
                              oferta_id (FK)
                              precio
                              region_id (FK → producto_region.codigo)
                              estado: estado_region
                                    │
                                    └── oferta
                                          id
                                          nombre
                                          descripcion
                                          fecha_inicio / fecha_fin
                                          estado: estado_oferta
```

**Enums**:
- `estado_region`: `HABILITADO | DESHABILITADO | PENDIENTE | DESHABILITADO_POR_DISPERSION | DESHABILITADO_POR_PRECIO`
- `estado_oferta`: `ACTIVA | INACTIVA | EXPIRADA`

---

## Arquitectura de Seguridad (Target)

> **Estado actual**: No implementada. `@nestjs/jwt` está instalado como dependencia base.
> La siguiente arquitectura es la meta a construir.

```
                    ┌──────────────────────────────────────────┐
                    │              REQUEST                     │
                    └──────────────────┬───────────────────────┘
                                       │
                     ┌──────────────────▼───────────────────────┐
                     │              HELMET                      │
                     └──────────────────┬───────────────────────┘
                                        │
                     ┌──────────────────▼───────────────────────┐
                     │                CORS                      │
                     │  Solo habilita GET en rutas públicas     │
                     │  (productos, categorías — endpoints      │
                     │   de consulta sin auth)                  │
                     └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │           CSRF MIDDLEWARE                │
                    │   (doble-submit cookie pattern)          │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │         GLOBAL VALIDATION PIPE           │
                    │   (class-validator + whitelist)          │
                    └──────────────────┬───────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
  ┌───────▼────────┐         ┌────────▼────────┐         ┌────────▼────────┐
  │  Rutas Públicas │         │  AuthGuard(JWT) │         │  AuthGuard(JWT) │
  │  (login, etc.)  │         │  + RolesGuard   │         │  + ClaimsGuard  │
  └───────┬────────┘         └────────┬────────┘         └────────┬────────┘
          │                            │                            │
          ▼                            ▼                            ▼
    sin restricción             RBAC por roles               Claims por permisos
                                                              + Roles opcional
```

### Flujo de Autenticación

| Paso              | Implementación                                    |
| ----------------- | ------------------------------------------------- |
| **Login**         | Passport-local strategy                          |
| **Payload JWT**   | Minimalista: `{ sub: userId }` (sin roles/claims) |
| **Transporte**    | Cookie `httpOnly`, `secure`, `sameSite: strict`  |
| **Verificación**  | JwtStrategy (extrae JWT de la cookie)            |
| **Privilegios**   | Consulta en BD al validar — no van en el token    |

#### Por qué payload mínimo

- Roles y claims pueden cambiar durante la vida del token — si viajan en el JWT quedan stale.
- Al consultarlos en cada request desde BD (o caché), se garantiza que los permisos están siempre actualizados.
- El token solo establece **quién** es el usuario; los **qué puede hacer** se resuelven al vuelo.

### Guardas

| Guarda               | Propósito                                              |
| ---------------------- | ------------------------------------------------------ |
| `AuthGuard(JWT)`      | Bloquea requests sin token válido. Adjunta `req.user`. |
| `RolesGuard`          | Verifica `@Roles(Role.ADMIN)` en handler/controller.   |
| `ClaimsGuard`         | Verifica `@Claim('producto:write')` en handler.        |
| `RolesOrClaimsGuard`  | Combina ambos: pasa si cumple rol O claim.             |

### RBAC + Claims

- **RBAC**: Roles fijos (`ADMIN`, `OPERADOR`, `VISOR`). Se asignan a usuarios.
- **Claims**: Permisos granulares basados en recursos (`producto:read`, `producto:write`, `region:admin`).
- Ambas capas coexisten: un endpoint puede exigir rol, claim, o ambos.
- Los decoradores `@Roles()` y `@Claim()` se aplican a handlers o controllers enteros.

Tablas de BD (planificadas):

```
model usuario {
  id       Int       @id
  email    String    @unique
  password String           // bcrypt hash
  rol      Role
  claims   ClaimUsuario[]
}

model claim {
  id       String    @id     // ej: "producto:write"
  usuarios ClaimUsuario[]
}

model ClaimUsuario {
  usuario_id Int
  claim_id   String
  @@id([usuario_id, claim_id])
}
```

### CSRF

- Patrón: **double-submit cookie** vía middleware.
- El servidor emite un token CSRF en una cookie legible por JS (`csrf-token`, no httpOnly).
- El frontend lo envía como header `x-csrf-token` en cada mutación (POST/PATCH/DELETE).
- El middleware compara cookie vs header — si no coinciden, rechaza.

```typescript
// main.ts (configuración esperada)
app.use(cookieParser());
app.use(csrfMiddleware({ cookie: { httpOnly: false, sameSite: 'strict' } }));
```

### Caché

- **Módulo**: `@nestjs/cache-manager` con `CacheModule.register()`.
- **Backend dual**: memoria local (desarrollo) o Redis (producción).
- **Uso principal**: cachear perfiles de usuario (roles, claims) para evitar consulta a BD en cada request del `ClaimsGuard`.
- **Invalidación**: Al modificar roles/claims de un usuario, se limpia su entrada en caché.
- **TTL**: 5 minutos por defecto.

```typescript
// Ejemplo en AuthService
@Injectable()
export class AuthService {
  constructor(private readonly cache: Cache) {}

  async getUserPermissions(userId: number): Promise<UserPermissions> {
    const cached = await this.cache.get<UserPermissions>(`user:${userId}:perms`);
    if (cached) return cached;

    const perms = await this.loadPermissionsFromDb(userId);
    await this.cache.set(`user:${userId}:perms`, perms, 300_000); // 5 min TTL
    return perms;
  }
}
```

---

## Convenciones del Código

- **Idioma**: Todo en español (modelos, DTOs, endpoints, mensajes de error).
- **Nombres de archivo**: kebab-case (`create-product.dto.ts`).
- **Inyección**: `private readonly` en constructores.
- **Paginación**: Respuesta estandarizada `{ datos, total, pagina, limite, totalPaginas }`.
- **Relaciones Prisma**: Definidas como constantes `RELACIONES_*` en cada DbService.
- **DTOs**: class-validator decorators en todos los campos. Update DTOs usan `PartialType`.
- **No se usan barrel files** (`index.ts`) salvo en `generated/prisma/`.

---

## Comandos Útiles

```bash
pnpm start:dev       # Desarrollo con hot-reload
pnpm build           # Compilar
pnpm lint            # ESLint
pnpm test            # Unit tests
pnpm test:e2e        # E2E tests
pnpm format          # Prettier
npx prisma generate  # Regenerar cliente Prisma
npx prisma migrate dev   # Crear/ejecutar migraciones
```

---

## Pendientes Críticos (según la arquitectura de seguridad definida)

1. [ ] Módulo `auth/` con Passport-local + JWT strategies
2. [ ] Emisión de cookie `httpOnly` con JWT al hacer login
3. [ ] `AuthGuard(JWT)` global (excepto rutas públicas)
4. [ ] `RolesGuard`, `ClaimsGuard`, decoradores `@Roles()`, `@Claim()`
5. [ ] Middleware CSRF (double-submit cookie)
6. [ ] `CacheModule` (memoria/Redis) para perfiles de usuario
7. [ ] `ValidationPipe` global con `whitelist: true`
8. [ ] Helmet
9. [ ] CORS (solo GET en endpoints públicos: productos, categorías)
10. [ ] Modelo `usuario`, `claim`, `ClaimUsuario` en Prisma
