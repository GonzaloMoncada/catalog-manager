import { Injectable } from '@nestjs/common';
import { RegionDbService } from './region-db/region/region-db.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionService {
  constructor(private readonly regionDbService: RegionDbService) {}

  crearRegion(data: CreateRegionDto) {
    return this.regionDbService.crearRegion(data);
  }

  obtenerRegiones(pagina?: number, limite?: number) {
    return this.regionDbService.obtenerRegiones(pagina, limite);
  }

  obtenerRegionPorId(id: number) {
    return this.regionDbService.obtenerRegionPorId(id);
  }

  obtenerProductosPorRegion(
    regionId: number,
    pagina?: number,
    limite?: number,
  ) {
    return this.regionDbService.obtenerProductosPorRegion(
      regionId,
      pagina,
      limite,
    );
  }

  actualizarRegion(id: number, data: UpdateRegionDto) {
    return this.regionDbService.actualizarRegion(id, data);
  }

  eliminarRegion(id: number) {
    return this.regionDbService.eliminarRegion(id);
  }
}
