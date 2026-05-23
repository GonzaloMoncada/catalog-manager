import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersDbService } from './users-db/users-db.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService, UsersDbService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
