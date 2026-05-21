import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  crearCategoria(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.crearCategoria(createCategoryDto);
  }

  @Get()
  obtenerCategorias(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.categoryService.obtenerCategorias(
      pagina ? +pagina : undefined,
      limite ? +limite : undefined,
    );
  }

  @Get(':id')
  obtenerCategoriaPorId(@Param('id') id: string) {
    return this.categoryService.obtenerCategoriaPorId(+id);
  }

  @Patch(':id')
  actualizarCategoria(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.actualizarCategoria(+id, updateCategoryDto);
  }

  @Delete(':id')
  eliminarCategoria(@Param('id') id: string) {
    return this.categoryService.eliminarCategoria(+id);
  }
}
