import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateRegistroActividadDto {
  @IsString()
  @IsNotEmpty()
  accion!: string;

  @IsString()
  @IsNotEmpty()
  nombre_tabla!: string;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;

  @IsOptional()
  @IsNumber()
  id_registro?: number;

  @IsOptional()
  @IsString()
  detalles?: string;
}
