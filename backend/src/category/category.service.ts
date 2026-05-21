import { Injectable } from '@nestjs/common';
import { CategoryDbService } from './category-db/category/category-db.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryDbService: CategoryDbService) {}

  crearCategoria(data: CreateCategoryDto) {
    return this.categoryDbService.crearCategoria(data);
  }

  obtenerCategorias(pagina?: number, limite?: number) {
    return this.categoryDbService.obtenerCategorias(pagina, limite);
  }

  obtenerCategoriaPorId(id: number) {
    return this.categoryDbService.obtenerCategoriaPorId(id);
  }

  actualizarCategoria(id: number, data: UpdateCategoryDto) {
    return this.categoryDbService.actualizarCategoria(id, data);
  }

  eliminarCategoria(id: number) {
    return this.categoryDbService.eliminarCategoria(id);
  }
}
