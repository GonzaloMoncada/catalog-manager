import { IsString, IsNumber, IsOptional, IsNotEmpty, IsUrl, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType } from '@nestjs/mapped-types';
import { CreateProductoRegionDto } from './create-producto-region.dto';

export class CreateProductRegionDto extends OmitType(CreateProductoRegionDto, [
  'producto_id',
]) {}

export class CreateProductDto {
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductRegionDto)
  regiones?: CreateProductRegionDto[];
}

