import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { estado_region } from '../../generated/prisma/enums';

export class CreateRegionDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsEnum(estado_region)
  estado?: keyof typeof estado_region;
}
