import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Public } from '../../common/decorators';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar categorias ativas' })
  async findAll(@Query('all') includeInactive?: string) {
    const result = await this.categoriesService.findAll(includeInactive === 'true');
    return { data: result, meta: { total: result.length }, error: null };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Buscar categoria por slug' })
  async findBySlug(@Param('slug') slug: string) {
    const result = await this.categoriesService.findBySlug(slug);
    return { data: result, meta: {}, error: null };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar categoria (ADMIN)' })
  async create(
    @Body()
    body: {
      name: string;
      slug: string;
      description?: string;
      imageUrl?: string;
      sortOrder?: number;
    },
  ) {
    const result = await this.categoriesService.create(body);
    return { data: result, meta: {}, error: null };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar categoria (ADMIN)' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string;
      imageUrl?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    const result = await this.categoriesService.update(id, body);
    return { data: result, meta: {}, error: null };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Excluir categoria (ADMIN)' })
  async delete(@Param('id') id: string) {
    await this.categoriesService.delete(id);
    return { data: { message: 'Categoria excluída com sucesso' }, meta: {}, error: null };
  }
}
