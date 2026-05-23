import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from 'src/auth/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  crearCategoria(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.crearCategoria(createCategoryDto);
  }

  @Public()
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

  @Public()
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
