import { Controller, Get, Param, Patch, Query, Body, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from '../reviews/reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  adminReviewsQuerySchema,
  moderateReviewSchema,
} from '../reviews/reviews.validation';
import type {
  AdminReviewsQueryDto,
  ModerateReviewDto,
} from '../reviews/reviews.validation';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar avaliações com filtro de status' })
  async findAll(@Query(new ZodValidationPipe(adminReviewsQuerySchema)) query: AdminReviewsQueryDto) {
    const result = await this.reviewsService.findAllForAdmin(query);
    return { data: result.reviews, meta: result.meta, error: null };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Aprovar ou rejeitar avaliação (moderação)' })
  async moderate(
    @CurrentUser() admin: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(moderateReviewSchema)) body: ModerateReviewDto,
  ) {
    const review = await this.reviewsService.moderate(admin.id, id, body.status);
    return { data: review, meta: {}, error: null };
  }
}
