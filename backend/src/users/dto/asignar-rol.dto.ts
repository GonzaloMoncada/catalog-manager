import { IsNumber, IsNotEmpty } from 'class-validator';

export class AsignarRolDto {
  @IsNumber()
  @IsNotEmpty()
  rol_id!: number;
}
