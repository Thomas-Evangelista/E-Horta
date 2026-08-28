import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService, type ProductFilter } from './products.service';
import type { AuditContext as AuditContextType } from '../audit/audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Public, AuditContext } from '../../common/decorators';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar produtos com filtros e paginação' })
  async findAll(
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('available') available?: string,
    @Query('sort') sort?: ProductFilter['sort'],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: ProductFilter = {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      available: available === 'true' ? true : available === 'false' ? false : undefined,
      sort,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    const result = await this.productsService.findAll(filters);
    return { data: result.products, meta: result.meta, error: null };
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Buscar produtos por nome, SKU ou descrição' })
  async search(@Query('q') query: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const filters: ProductFilter = {
      search: query,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    const result = await this.productsService.findAll(filters);
    return { data: result.products, meta: result.meta, error: null };
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Produtos em destaque' })
  async findFeatured(@Query('limit') limit?: string) {
    const result = await this.productsService.findFeatured(limit ? parseInt(limit, 10) : 10);
    return { data: result, meta: { total: result.length }, error: null };
  }

  @Public()
  @Get('best-sellers')
  @ApiOperation({ summary: 'Produtos mais vendidos' })
  async findBestSellers(@Query('limit') limit?: string) {
    const result = await this.productsService.findBestSellers(limit ? parseInt(limit, 10) : 10);
    return { data: result, meta: { total: result.length }, error: null };
  }

  @Public()
  @Get('promotions')
  @ApiOperation({ summary: 'Produtos em promoção' })
  async findOnPromotion(@Query('limit') limit?: string) {
    const result = await this.productsService.findOnPromotion(limit ? parseInt(limit, 10) : 10);
    return { data: result, meta: { total: result.length }, error: null };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Detalhes do produto por slug' })
  async findBySlug(@Param('slug') slug: string) {
    const result = await this.productsService.findBySlug(slug);
    return { data: result, meta: {}, error: null };
  }

  @Public()
  @Get(':id/recommendations')
  @ApiOperation({ summary: 'Recomendações de produtos similares' })
  async findRecommendations(@Param('id') id: string, @Query('limit') limit?: string) {
    const result = await this.productsService.findRecommendations(id, limit ? parseInt(limit, 10) : 6);
    return { data: result, meta: { total: result.length }, error: null };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar produto (ADMIN)' })
  async create(
    @AuditContext() ctx: AuditContextType,
    @Body()
    body: {
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
    },
  ) {
    const result = await this.productsService.create({ ...body, ctx });
    return { data: result, meta: {}, error: null };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto (ADMIN)' })
  async update(
    @Param('id') id: string,
    @AuditContext() ctx: AuditContextType,
    @Body()
    body: {
      categoryId?: string;
      name?: string;
      slug?: string;
      description?: string;
      shortDescription?: string;
      sku?: string;
      unit?: string;
      weight?: number;
      price?: number;
      compareAtPrice?: number | null;
      costPrice?: number | null;
      imageUrl?: string;
      isActive?: boolean;
      isFeatured?: boolean;
    },
  ) {
    const result = await this.productsService.update(id, { ...body, ctx });
    return { data: result, meta: {}, error: null };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Excluir produto (ADMIN)' })
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
    return { data: { message: 'Produto excluído com sucesso' }, meta: {}, error: null };
  }
}
