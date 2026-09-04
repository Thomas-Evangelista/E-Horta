import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '[Admin] Indicadores do painel administrativo' })
  async getDashboard() {
    const result = await this.adminService.getDashboard();
    return { data: result, meta: {}, error: null };
  }

  @Get('dashboard/trends')
  @ApiOperation({ summary: '[Admin] Tendência diária de pedidos e receita' })
  async getTrends(@Query('days') days?: string) {
    const parsed = Math.min(Math.max(parseInt(days ?? '30', 10) || 30, 1), 90);
    const result = await this.adminService.getTrends(parsed);
    return { data: result, meta: { days: parsed }, error: null };
  }

  @Get('dashboard/recent-orders')
  @ApiOperation({ summary: '[Admin] Pedidos recentes do painel' })
  async getRecentOrders(@Query('limit') limit?: string) {
    const parsed = Math.min(Math.max(parseInt(limit ?? '8', 10) || 8, 1), 20);
    const result = await this.adminService.getRecentOrders(parsed);
    return { data: result, meta: { limit: parsed }, error: null };
  }
}