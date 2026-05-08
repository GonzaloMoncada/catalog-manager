import { IsString, IsOptional, IsNotEmpty, IsEnum, IsISO8601, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType } from '@nestjs/mapped-types';
import { estado_oferta } from '../../generated/prisma/enums';
import { CreateOfertaProductoDto } from './create-oferta-producto.dto';

export class CreateOfertaProductDto extends OmitType(CreateOfertaProductoDto, [
  'oferta_id',
]) {}

export class CreateOfertaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsISO8601()
  fecha_inicio!: string;

  @IsISO8601()
  fecha_fin!: string;

  @IsOptional()
  @IsEnum(estado_oferta)
  estado?: keyof typeof estado_oferta;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOfertaProductDto)
  productos!: CreateOfertaProductDto[];
}
