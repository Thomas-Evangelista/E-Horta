import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from '../products/products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createProductSchema,
  updateProductSchema,
  adminProductsQuerySchema,
} from '../products/products.validation';
import type {
  CreateProductDto,
  UpdateProductDto,
  AdminProductsQueryDto,
} from '../products/products.validation';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar produtos (inclui inativos)' })
  async findAll(@Query(new ZodValidationPipe(adminProductsQuerySchema)) query: AdminProductsQueryDto) {
    const result = await this.productsService.findAllForAdmin(query);
    return { data: result.products, meta: result.meta, error: null };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Criar produto' })
  async create(@Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto) {
    const result = await this.productsService.create(body);
    return { data: result, meta: {}, error: null };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Atualizar produto (preço, ativo/desativar etc.)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ) {
    const result = await this.productsService.update(id, body);
    return { data: result, meta: {}, error: null };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Excluir produto (bloqueado se houver pedidos/carrinhos)' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.delete(id);
    return { data: null, meta: {}, error: null };
  }
}