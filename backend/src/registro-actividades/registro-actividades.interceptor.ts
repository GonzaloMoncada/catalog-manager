import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RegistroActividadesService } from './registro-actividades.service';
import { AUDIT_TABLE_KEY, SKIP_AUDIT_KEY } from './audit.decorator';

@Injectable()
export class RegistroActividadesInterceptor implements NestInterceptor {
  constructor(
    private readonly registroActividadesService: RegistroActividadesService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      handler,
      controller,
    ]);
    if (skip) {
      return next.handle();
    }

    const nombreTabla = this.reflector.getAllAndOverride<string>(
      AUDIT_TABLE_KEY,
      [handler, controller],
    );
    if (!nombreTabla) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    const accionMap: Record<string, string> = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };
    const accion = accionMap[method];
    if (!accion) {
      return next.handle();
    }

    const user = request.user;

    return next.handle().pipe(
      tap((data) => {
        const registroData = {
          accion,
          nombre_tabla: nombreTabla,
          id_registro: data?.id ? Number(data.id) : undefined,
          usuario_id: user?.userId ? Number(user.userId) : undefined,
          detalles: data ? JSON.stringify(data) : undefined,
        };
        this.registroActividadesService
          .crearRegistroActividad(registroData)
          .catch(() => {});
      }),
    );
  }
}
