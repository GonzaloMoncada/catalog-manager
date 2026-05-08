import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoRegionDto } from './create-producto-region.dto';

export class UpdateProductoRegionDto extends PartialType(CreateProductoRegionDto) {}
