import { IsString, IsNumber, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { estado_region } from '../../generated/prisma/enums';

export class CreateOfertaProductoDto {
  @IsNumber()
  oferta_id!: number;

  @IsNumber()
  precio!: number;

  @IsString()
  @IsNotEmpty()
  region_id!: string;

  @IsOptional()
  @IsEnum(estado_region)
  estado?: keyof typeof estado_region;
}
