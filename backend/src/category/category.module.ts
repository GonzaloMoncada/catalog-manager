import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category\categoryDbService } from './category-db/category/category-db.service';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, Category\categoryDbService],
})
export class CategoryModule {}
