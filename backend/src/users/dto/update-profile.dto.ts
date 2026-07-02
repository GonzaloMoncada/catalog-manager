import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nombre_usuario?: string;

  @IsOptional()
  @IsUrl()
  image_url?: string;
}
