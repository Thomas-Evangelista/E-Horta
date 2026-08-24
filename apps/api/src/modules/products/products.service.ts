import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type Product, type ProductUnit } from '@prisma/client';

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  featured?: boolean;
  available?: boolean;
  promotion?: boolean;
  sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  products: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: ProductFilter): Promise<PaginatedProducts> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (filters.category) {
      const category = await this.prisma.category.findUnique({
        where: { slug: filters.category },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.featured !== undefined) {
      where.isFeatured = filters.featured;
    }

    if (filters.available !== undefined && filters.available) {
      where.inventory = {
        quantity: { gt: 0 },
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (filters.sort) {
        case 'price-asc':
          return { price: 'asc' };
        case 'price-desc':
          return { price: 'desc' };
        case 'name-asc':
          return { name: 'asc' };
        case 'name-desc':
          return { name: 'desc' };
        case 'newest':
          return { createdAt: 'desc' };
        default:
          return { createdAt: 'desc' };
      }
    })();

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          inventory: { select: { quantity: true, reservedQuantity: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Listagem administrativa: inclui produtos inativos e permite filtrar
   * por categoria e status ativo.
   */
  async findAllForAdmin(
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      isActive?: boolean;
    } = {},
  ): Promise<PaginatedProducts> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(Math.max(1, filters.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { slug: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          inventory: { select: { quantity: true, reservedQuantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reservedQuantity: true, minimumStock: true } },
        productImages: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { status: 'APPROVED' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: true,
        productImages: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async findFeatured(limit = 10) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        inventory: { quantity: { gt: 0 } },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reservedQuantity: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBestSellers(limit = 10) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        inventory: { quantity: { gt: 0 } },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reservedQuantity: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { orderItems: { _count: 'desc' } },
      take: limit,
    });

    return products;
  }

  async findOnPromotion(limit = 10) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        compareAtPrice: { not: null },
        inventory: { quantity: { gt: 0 } },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reservedQuantity: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRecommendations(productId: string, limit = 6) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });

    if (!product) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: product.categoryId,
        id: { not: productId },
        inventory: { quantity: { gt: 0 } },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reservedQuantity: true } },
      },
      take: limit,
      orderBy: { isFeatured: 'desc' },
    });
  }

  async create(data: {
    categoryId: string;
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    sku: string;
    unit?: string;
    weight?: number;
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    imageUrl?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  }) {
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new ConflictException('Já existe um produto com este slug');
    }

    const existingSku = await this.prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new ConflictException('Já existe um produto com este SKU');
    }

    await this.prisma.category.findUniqueOrThrow({
      where: { id: data.categoryId },
    });

    const product = await this.prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          shortDescription: data.shortDescription,
          sku: data.sku,
          unit: (data.unit as ProductUnit) || 'UN',
          weight: data.weight,
          price: new Prisma.Decimal(data.price),
          compareAtPrice: data.compareAtPrice
            ? new Prisma.Decimal(data.compareAtPrice)
            : null,
          costPrice: data.costPrice
            ? new Prisma.Decimal(data.costPrice)
            : null,
          imageUrl: data.imageUrl,
          isActive: data.isActive ?? true,
          isFeatured: data.isFeatured ?? false,
        },
      });

      await tx.inventory.create({
        data: {
          productId: p.id,
          quantity: 0,
          reservedQuantity: 0,
          minimumStock: 5,
        },
      });

      return p;
    });

    this.logger.log(`Product created: ${product.name} (${product.id})`);
    return product;
  }

  async update(
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      slug?: string;
      description?: string | null;
      shortDescription?: string | null;
      sku?: string;
      unit?: string;
      weight?: number | null;
      price?: number;
      compareAtPrice?: number | null;
      costPrice?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
      isFeatured?: boolean;
    },
  ) {
    const product = await this.findById(id);

    if (data.slug && data.slug !== product.slug) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException('Já existe um produto com este slug');
      }
    }

    if (data.sku && data.sku !== product.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existing) {
        throw new ConflictException('Já existe um produto com este SKU');
      }
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (data.categoryId) updateData.category = { connect: { id: data.categoryId } };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.unit !== undefined) updateData.unit = data.unit as ProductUnit;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
    if (data.compareAtPrice !== undefined)
      updateData.compareAtPrice = data.compareAtPrice
        ? new Prisma.Decimal(data.compareAtPrice)
        : null;
    if (data.costPrice !== undefined)
      updateData.costPrice = data.costPrice
        ? new Prisma.Decimal(data.costPrice)
        : null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Product updated: ${updated.name} (${updated.id})`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const product = await this.findById(id);

    const hasOrders = await this.prisma.orderItem.count({
      where: { productId: id },
    });

    if (hasOrders > 0) {
      throw new ConflictException(
        'Não é possível excluir um produto que possui pedidos',
      );
    }

    const inCarts = await this.prisma.cartItem.count({
      where: { productId: id },
    });

    if (inCarts > 0) {
      throw new ConflictException(
        'Não é possível excluir um produto que está em carrinhos ativos. Desative-o.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.inventory.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    this.logger.log(`Product deleted: ${product.name} (${product.id})`);
  }
}
