import { PartialType } from '@nestjs/mapped-types';
import { CreateOfertaProductoDto } from './create-oferta-producto.dto';

export class UpdateOfertaProductoDto extends PartialType(CreateOfertaProductoDto) {}
