import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { type Category } from '@prisma/client';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async findById(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
  }): Promise<Category> {
    const existing = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictException('Já existe uma categoria com este slug');
    }

    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    this.logger.log(`Category created: ${category.name} (${category.id})`);
    return category;
  }

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      imageUrl?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ): Promise<Category> {
    const category = await this.findById(id);

    if (data.slug && data.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException('Já existe uma categoria com este slug');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });

    this.logger.log(`Category updated: ${updated.name} (${updated.id})`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const category = await this.findById(id);

    const hasProducts = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (hasProducts > 0) {
      throw new ConflictException(
        'Não é possível excluir uma categoria com produtos',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    this.logger.log(`Category deleted: ${category.name} (${category.id})`);
  }
}
