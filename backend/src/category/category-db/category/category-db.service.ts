import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from '../../dto/create-category.dto';
import { UpdateCategoryDto } from '../../dto/update-category.dto';

const RELACIONES_CATEGORIA = {
  Parent: true,
  Children: true,
} as const;

@Injectable()
export class CategoryDbService {
  constructor(private readonly prisma: PrismaService) {}

  async crearCategoria(data: CreateCategoryDto) {
    const { parent_id, ...datosCategoria } = data;
    return this.prisma.categorias.create({
      data: {
        ...datosCategoria,
        ...(parent_id !== undefined && {
          Parent: { connect: { id: parent_id } },
        }),
      },
      include: RELACIONES_CATEGORIA,
    });
  }

  async obtenerCategorias(pagina = 1, limite = 10) {
    const saltar = (pagina - 1) * limite;

    const [categorias, total] = await Promise.all([
      this.prisma.categorias.findMany({
        skip: saltar,
        take: limite,
        include: RELACIONES_CATEGORIA,
      }),
      this.prisma.categorias.count(),
    ]);

    return {
      datos: categorias,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtenerCategoriaPorId(id: number) {
    const categoria = await this.prisma.categorias.findUnique({
      where: { id },
      include: RELACIONES_CATEGORIA,
    });

    if (!categoria) {
      throw new NotFoundException(`Categoria con id ${id} no encontrada`);
    }

    return categoria;
  }

  async actualizarCategoria(id: number, data: UpdateCategoryDto) {
    const categoria = await this.prisma.categorias.findUnique({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoria con id ${id} no encontrada`);
    }

    const { parent_id, ...datosCategoria } = data;

    return this.prisma.categorias.update({
      where: { id },
      data: {
        ...datosCategoria,
        ...(parent_id !== undefined && {
          Parent: { connect: { id: parent_id } },
        }),
      },
      include: RELACIONES_CATEGORIA,
    });
  }

  async eliminarCategoria(id: number) {
    const categoria = await this.prisma.categorias.findUnique({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoria con id ${id} no encontrada`);
    }

    return this.prisma.categorias.delete({
      where: { id },
    });
  }
}
