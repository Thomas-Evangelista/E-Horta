import { Controller, Get, Param, Patch, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações internas do usuário autenticado' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.notificationsService.listForUser(
      user.id,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { data: result.notifications, meta: result.meta, error: null };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contar notificações não lidas' })
  async countUnread(@CurrentUser() user: { id: string }) {
    const total = await this.notificationsService.countUnread(user.id);
    return { data: { total }, meta: {}, error: null };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  async markRead(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationsService.markRead(user.id, id);
    return { data: { success: true }, meta: {}, error: null };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  async markAllRead(@CurrentUser() user: { id: string }) {
    await this.notificationsService.markAllRead(user.id);
    return { data: { success: true }, meta: {}, error: null };
  }
}
