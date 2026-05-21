import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CategoryDbService } from './category-db/category/category-db.service';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, CategoryDbService],
})
export class CategoryModule {}
