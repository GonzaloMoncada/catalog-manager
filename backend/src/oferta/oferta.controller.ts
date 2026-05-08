import { Controller } from '@nestjs/common';
import { OfertaService } from './oferta.service';

@Controller('oferta')
export class OfertaController {
  constructor(private readonly ofertaService: OfertaService) {}
}
