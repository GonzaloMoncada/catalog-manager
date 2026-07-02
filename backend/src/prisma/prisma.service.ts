import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const MODELOS = [
  'producto', 'categorias', 'region', 'producto_region',
  'oferta_producto', 'oferta', 'usuarios', 'tipos_roles',
  'permisos', 'roles_permisos', 'usuarios_roles', 'registro_actividades',
];

const RETRY_MENSAJES = [
  'Connection terminated',
  'not queryable',
  'SocketTimeout',
  'Connection timeout',
];

function esErrorDeConexion(err: any): boolean {
  if (err?.code === 'P1008') return true;
  const msg = err?.message ?? '';
  return RETRY_MENSAJES.some((p) => msg.includes(p));
}

async function conReintento<T>(fn: () => Promise<T>): Promise<T> {
  const MAX = 3;
  let ultimo: any;
  for (let i = 0; i < MAX; i++) {
    try {
      return await fn();
    } catch (err: any) {
      ultimo = err;
      if (!esErrorDeConexion(err)) throw err;
      if (i < MAX - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 150));
      }
    }
  }
  throw ultimo;
}

function envolverModelo(delegate: any): any {
  if (!delegate || typeof delegate !== 'object') return delegate;
  return new Proxy(delegate, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original === 'function') {
        return (...args: any[]) => conReintento(() => original.apply(target, args));
      }
      return original;
    },
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true',
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      statement_timeout: 30000,
      allowExitOnIdle: true,
    });

    pool.on('error', (err) => {
      this.logger.warn(`Error en pool pg: ${err.message}`);
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });

    return new Proxy(this, {
      get(target, prop, receiver) {
        const original = Reflect.get(target, prop, receiver);
        if (typeof prop === 'string' && MODELOS.includes(prop)) {
          return envolverModelo(original);
        }
        return original;
      },
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
