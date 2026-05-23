import { IsNumber, IsNotEmpty } from 'class-validator';

export class AsignarPermisoDto {
  @IsNumber()
  @IsNotEmpty()
  permiso_id!: number;
}
