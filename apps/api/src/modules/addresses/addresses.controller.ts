import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar endereços do usuário' })
  async findAll(@CurrentUser() user: { id: string }) {
    const result = await this.addressesService.findAll(user.id);
    return { data: result, meta: { total: result.length }, error: null };
  }

  @Post()
  @ApiOperation({ summary: 'Criar endereço' })
  async create(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      label?: string;
      zipCode: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    const result = await this.addressesService.create(user.id, body);
    return { data: result, meta: {}, error: null };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar endereço' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body()
    body: {
      label?: string;
      zipCode?: string;
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    const result = await this.addressesService.update(user.id, id, body);
    return { data: result, meta: {}, error: null };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir endereço' })
  async delete(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.addressesService.delete(user.id, id);
    return { data: { message: 'Endereço excluído com sucesso' }, meta: {}, error: null };
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Definir endereço como padrão' })
  async setDefault(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const result = await this.addressesService.setDefault(user.id, id);
    return { data: result, meta: {}, error: null };
  }
}
