import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductModule } from './product/product.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoryModule } from './category/category.module';
import { OfertaModule } from './oferta/oferta.module';
import { RegionModule } from './region/region.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolModule } from './rol/rol.module';
import { PermisoModule } from './permiso/permiso.module';
import { PermisosModule } from './auth/permisos/permisos.module';
import { RegistroActividadesModule } from './registro-actividades/registro-actividades.module';
import { RegistroActividadesInterceptor } from './registro-actividades/registro-actividades.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PermisosModule,
    ProductModule,
    PrismaModule,
    CategoryModule,
    OfertaModule,
    RegionModule,
    AuthModule,
    UsersModule,
    RolModule,
    PermisoModule,
    RegistroActividadesModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RegistroActividadesInterceptor,
    },
  ],
})
export class AppModule {}
