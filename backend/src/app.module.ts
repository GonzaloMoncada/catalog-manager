import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductModule } from './product/product.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { CategoryModule } from './category/category.module';
import { OfertaModule } from './oferta/oferta.module';
import { RegionModule } from './region/region.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ProductModule, PrismaModule, CategoryModule, OfertaModule, RegionModule],
})
export class AppModule {}
