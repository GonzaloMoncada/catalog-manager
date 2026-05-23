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
import { PermisosGuard } from 'src/auth/permisos/permisos.guard';
import { Public } from 'src/auth/public.decorator';
import { RequirePermissions } from 'src/auth/permisos/permisos.decorator';
import { Permisos } from 'src/auth/permisos/permisos.enum';

@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @RequirePermissions(Permisos.CATEGORIA_CREATE)
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

  @RequirePermissions(Permisos.CATEGORIA_UPDATE)
  @Patch(':id')
  actualizarCategoria(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.actualizarCategoria(+id, updateCategoryDto);
  }

  @RequirePermissions(Permisos.CATEGORIA_DELETE)
  @Delete(':id')
  eliminarCategoria(@Param('id') id: string) {
    return this.categoryService.eliminarCategoria(+id);
  }
}
