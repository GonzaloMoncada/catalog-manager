import { IsString, IsNumber, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { estado_region } from '../../generated/prisma/enums';

export class CreateProductoRegionDto {
  @IsNumber()
  producto_id!: number;

  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsNumber()
  precio!: number;

  @IsNumber()
  region_id!: number;

  @IsOptional()
  @IsEnum(estado_region)
  estado?: keyof typeof estado_region;
}
