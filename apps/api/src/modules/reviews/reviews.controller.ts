import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CurrentUser, Public } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createReviewSchema, reviewsQuerySchema } from './reviews.validation';
import type { CreateReviewDto, ReviewsQueryDto } from './reviews.validation';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'Listar avaliações aprovadas de um produto' })
  async findForProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(new ZodValidationPipe(reviewsQuerySchema)) query: ReviewsQueryDto,
  ) {
    const result = await this.reviewsService.findForProduct(productId, query.page, query.limit);
    return {
      data: result.reviews,
      meta: { ...result.meta, summary: result.summary },
      error: null,
    };
  }

  @Public()
  @Get('products/:productId/reviews/summary')
  @ApiOperation({ summary: 'Resumo de avaliações (média e total) do produto' })
  async getSummary(@Param('productId', ParseUUIDPipe) productId: string) {
    const summary = await this.reviewsService.getRatingSummary(productId);
    return { data: summary, meta: {}, error: null };
  }

  @Post('products/:productId/reviews')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Avaliar produto comprado (1 a 5 estrelas)' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(new ZodValidationPipe(createReviewSchema)) dto: CreateReviewDto,
  ) {
    const review = await this.reviewsService.createForUser(user.id, productId, dto);
    return { data: review, meta: {}, error: null };
  }

  @ApiBearerAuth()
  @Get('reviews/me')
  @ApiOperation({ summary: 'Listar avaliações do usuário autenticado' })
  async findMine(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(reviewsQuerySchema)) query: ReviewsQueryDto,
  ) {
    const result = await this.reviewsService.findMine(user.id, query.page, query.limit);
    return { data: result.reviews, meta: result.meta, error: null };
  }

  @ApiBearerAuth()
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir avaliação própria' })
  async remove(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    await this.reviewsService.removeForOwner(user.id, id);
  }
}
