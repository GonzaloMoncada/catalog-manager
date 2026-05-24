import { IsString, IsNotEmpty } from 'class-validator';

export class CambiarContrasenaDto {
  @IsString()
  @IsNotEmpty()
  contrasena_actual!: string;

  @IsString()
  @IsNotEmpty()
  contrasena_nueva!: string;
}
