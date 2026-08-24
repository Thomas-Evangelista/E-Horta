import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateReviewDto } from './reviews.validation';

/** Statuses que caracterizam compra paga (permitem avaliação). */
const PURCHASED_ORDER_STATUSES = [
  'PAYMENT_APPROVED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export interface ReviewResponse {
  id: string;
  productId: string;
  orderId: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: Date;
  user: { id: string; name: string };
}

export interface ProductReviewsResult {
  reviews: ReviewResponse[];
  summary: {
    average: number;
    total: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface MyReview extends Omit<ReviewResponse, 'user'> {
  product: { id: string; name: string; slug: string };
}

export interface AdminReview extends ReviewResponse {
  product: { id: string; name: string; slug: string };
}

export interface RatingSummary {
  average: number;
  total: number;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria avaliação (spec #33). Somente usuários que compraram o produto
   * podem avaliar e cada usuário avalia cada produto uma única vez.
   */
  async createForUser(
    userId: string,
    productId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Produto não encontrado');
    }

    const purchase = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: { in: [...PURCHASED_ORDER_STATUSES] },
        },
      },
      orderBy: { order: { createdAt: 'desc' } },
      select: { orderId: true },
    });

    if (!purchase) {
      throw new ForbiddenPurchaseException();
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          productId,
          orderId: purchase.orderId,
          rating: dto.rating,
          comment: dto.comment ?? null,
          status: 'PENDING',
        },
        include: { user: { select: { id: true, name: true } } },
      });

      this.logger.log(`Review created by user ${userId} for product ${productId}`);
      return this.toReviewResponse(review);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'Você já avaliou este produto',
        });
      }
      throw error;
    }
  }

  /** Lista pública de avaliações aprovadas de um produto com resumo. */
  async findForProduct(
    productId: string,
    page = 1,
    limit = 20,
  ): Promise<ProductReviewsResult> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);

    const where: Prisma.ReviewWhereInput = { productId, status: 'APPROVED' };

    const [total, reviews, aggregate] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    // Distribuição por estrelas para exibição no frontend.
    const distributionRows = await this.prisma.review.groupBy({
      by: ['rating'],
      where,
      _count: true,
    });

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distributionRows) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count;
      }
    }

    return {
      reviews: reviews.map((review) => this.toReviewResponse(review)),
      summary: {
        average: roundAverage(aggregate._avg.rating),
        total: aggregate._count,
        distribution,
      },
      meta: buildMeta(safePage, safeLimit, total),
    };
  }

  /** Avaliações do próprio usuário autenticado. */
  async findMine(userId: string, page = 1, limit = 20): Promise<{
    reviews: MyReview[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const where: Prisma.ReviewWhereInput = { userId };

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        productId: review.productId,
        orderId: review.orderId,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: review.createdAt,
        product: review.product,
      })),
      meta: buildMeta(safePage, safeLimit, total),
    };
  }

  /** Remove avaliação do próprio autor. */
  async removeForOwner(userId: string, reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true },
    });

    if (!review) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    if (review.userId !== userId) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    await this.prisma.review.delete({ where: { id: review.id } });
    this.logger.log(`Review ${review.id} removed by owner user ${userId}`);
  }

  /** Listagem administrativa com filtro de status (moderação). */
  async findAllForAdmin(
    filters: { page?: number; limit?: number; status?: ReviewStatus } = {},
  ): Promise<{
    reviews: AdminReview[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const safeLimit = Math.min(Math.max(1, filters.limit ?? 20), 100);
    const safePage = Math.max(1, filters.page ?? 1);
    const where: Prisma.ReviewWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          user: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    return {
      reviews: reviews.map((review) => ({
        ...this.toReviewResponse(review),
        product: review.product,
      })),
      meta: buildMeta(safePage, safeLimit, total),
    };
  }

  /**
   * Moderação (spec #17): aprova/rejeita avaliação pendente.
   * Toda transição é registrada em AuditLog.
   */
  async moderate(
    adminUserId: string,
    reviewId: string,
    status: Extract<ReviewStatus, 'APPROVED' | 'REJECTED'>,
  ): Promise<AdminReview> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, status: true },
    });

    if (!review) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    if (review.status === status) {
      throw new BadRequestException({
        code: 'REVIEW_SAME_STATUS',
        message: `Avaliação já está no status ${status}`,
      });
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.review.update({
        where: { id: review.id },
        data: { status },
        include: {
          user: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'REVIEW_MODERATED',
          entity: 'review',
          entityId: review.id,
          metadata: { from: review.status, to: status },
        },
      }),
    ]);

    this.logger.log(`Review ${review.id} moderated to ${status} by admin ${adminUserId}`);
    return { ...this.toReviewResponse(updated), product: updated.product };
  }

  /** Resumo de avaliações aprovadas (para embutir em respostas de produto). */
  async getRatingSummary(productId: string): Promise<RatingSummary> {
    const aggregate = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    return {
      average: roundAverage(aggregate._avg.rating),
      total: aggregate._count,
    };
  }

  private toReviewResponse(review: {
    id: string;
    productId: string;
    orderId: string | null;
    rating: number;
    comment: string | null;
    status: ReviewStatus;
    createdAt: Date;
    user?: { id: string; name: string } | null;
  }): ReviewResponse {
    return {
      id: review.id,
      productId: review.productId,
      orderId: review.orderId,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      createdAt: review.createdAt,
      user:
        review.user ?? {
          id: '',
          name: '',
        },
    };
  }
}

/** 403 semântico para "não comprou o produto" (spec #44 UX de erros). */
class ForbiddenPurchaseException extends ConflictException {
  constructor() {
    super({
      code: 'REVIEW_PURCHASE_REQUIRED',
      message: 'Somente clientes que compraram este produto podem avaliá-lo',
    });
  }
}

function buildMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function roundAverage(value: number | null): number {
  if (value === null || Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value * 10) / 10;
}
