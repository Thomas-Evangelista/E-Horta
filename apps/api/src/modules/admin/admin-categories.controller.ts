import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../categories/categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCategorySchema, updateCategorySchema } from '../categories/categories.validation';
import type { CreateCategoryDto, UpdateCategoryDto } from '../categories/categories.validation';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar categorias (inclui inativas)' })
  async findAll(@Query('all') _all?: string) {
    const result = await this.categoriesService.findAll(true);
    return { data: result, meta: {}, error: null };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Criar categoria' })
  async create(@Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryDto) {
    const result = await this.categoriesService.create(body);
    return { data: result, meta: {}, error: null };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Atualizar categoria (nome, ordem, ativar/desativar)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryDto,
  ) {
    const result = await this.categoriesService.update(id, body);
    return { data: result, meta: {}, error: null };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Excluir categoria (bloqueada se tiver produtos)' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.delete(id);
    return { data: null, meta: {}, error: null };
  }
}