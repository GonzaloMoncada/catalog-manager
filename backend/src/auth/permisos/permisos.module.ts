import { Global, Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { PermisosGuard } from './permisos.guard';

@Global()
@Module({
  imports: [UsersModule],
  providers: [PermisosGuard],
  exports: [PermisosGuard],
})
export class PermisosModule {}
