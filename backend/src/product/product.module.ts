import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductDbService } from './product-db/product-db.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, ProductDbService],
})
export class ProductModule {}
