import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromotionsService } from '../promotions/promotions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createPromotionSchema,
  updatePromotionSchema,
  adminPromotionsQuerySchema,
} from '../promotions/promotions.validation';
import type {
  CreatePromotionDto,
  UpdatePromotionDto,
  AdminPromotionsQueryDto,
} from '../promotions/promotions.validation';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar promoções/cupons' })
  async findAll(@Query(new ZodValidationPipe(adminPromotionsQuerySchema)) query: AdminPromotionsQueryDto) {
    const result = await this.promotionsService.findAllForAdmin(query);
    return { data: result.promotions, meta: result.meta, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Detalhar promoção' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.promotionsService.findPromotionById(id);
    return { data: result, meta: {}, error: null };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Criar promoção/cupom' })
  async create(@Body(new ZodValidationPipe(createPromotionSchema)) body: CreatePromotionDto) {
    const result = await this.promotionsService.createPromotion(body);
    return { data: result, meta: {}, error: null };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Atualizar promoção (ativar/desativar incluído)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePromotionSchema)) body: UpdatePromotionDto,
  ) {
    const result = await this.promotionsService.updatePromotion(id, body);
    return { data: result, meta: {}, error: null };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Excluir promoção (bloqueada se já utilizada)' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.promotionsService.deletePromotion(id);
    return { data: null, meta: {}, error: null };
  }
}