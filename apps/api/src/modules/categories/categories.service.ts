import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { type Category } from '@prisma/client';
import { CacheService } from '../cache/cache.service';

const CATEGORIES_CACHE_TTL = 300;
const CATEGORIES_CACHE_PREFIX = 'cache:categories:';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(includeInactive = false): Promise<Category[]> {
    const cacheKey = includeInactive
      ? `${CATEGORIES_CACHE_PREFIX}list:all`
      : `${CATEGORIES_CACHE_PREFIX}list:active`;
    const cached = await this.cache.get<Category[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    await this.cache.set(cacheKey, categories, CATEGORIES_CACHE_TTL);
    return categories;
  }

  async findBySlug(slug: string): Promise<Category> {
    const cacheKey = `${CATEGORIES_CACHE_PREFIX}${slug}`;
    const cached = await this.cache.get<Category>(cacheKey);
    if (cached) return cached;

    const category = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    await this.cache.set(cacheKey, category, CATEGORIES_CACHE_TTL);
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
    await this.cache.delByPrefix(CATEGORIES_CACHE_PREFIX);
    return category;
  }

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      imageUrl?: string | null;
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
    await this.cache.delByPrefix(CATEGORIES_CACHE_PREFIX);
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
    await this.cache.delByPrefix(CATEGORIES_CACHE_PREFIX);
  }
}
