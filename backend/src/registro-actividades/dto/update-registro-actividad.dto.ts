import { PartialType } from '@nestjs/mapped-types';
import { CreateRegistroActividadDto } from './create-registro-actividad.dto';

export class UpdateRegistroActividadDto extends PartialType(CreateRegistroActividadDto) {}
