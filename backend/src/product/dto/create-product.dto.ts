import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsUrl,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType } from '@nestjs/mapped-types';
import { CreateProductoRegionDto } from './create-producto-region.dto';
import { estado_region } from '../../generated/prisma/enums';

export class CreateProductRegionDto extends OmitType(CreateProductoRegionDto, [
  'producto_id',
]) {}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsUrl()
  imagenUrl?: string;

  @IsOptional()
  @IsNumber()
  categoria_id?: number;

  @IsOptional()
  @IsEnum(estado_region)
  estado?: keyof typeof estado_region;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductRegionDto)
  regiones?: CreateProductRegionDto[];
}
