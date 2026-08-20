import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Inventory } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(productId: string): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Registro de estoque não encontrado');
    }

    return inventory;
  }

  async findAll() {
    return this.prisma.inventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            unit: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findLowStock() {
    return this.prisma.inventory.findMany({
      where: {
        OR: [
          { quantity: { lte: 5 } },
          {
            quantity: { gt: 0 },
            minimumStock: { gt: 0 },
          },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            unit: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });
  }

  async updateStock(
    productId: string,
    data: {
      quantity?: number;
      minimumStock?: number;
    },
  ): Promise<Inventory> {
    await this.findByProductId(productId);

    if (data.quantity !== undefined && data.quantity < 0) {
      throw new Error('Estoque não pode ser negativo');
    }

    const updated = await this.prisma.inventory.update({
      where: { productId },
      data: {
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.minimumStock !== undefined && { minimumStock: data.minimumStock }),
      },
    });

    this.logger.log(
      `Inventory updated for product ${productId}: quantity=${updated.quantity}`,
    );

    return updated;
  }

  async reserveStock(
    productId: string,
    quantity: number,
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Registro de estoque não encontrado');
    }

    const available = inventory.quantity - inventory.reservedQuantity;

    if (available < quantity) {
      throw new Error(
        `Estoque insuficiente. Disponível: ${available}, Solicitado: ${quantity}`,
      );
    }

    return this.prisma.inventory.update({
      where: { productId },
      data: {
        reservedQuantity: { increment: quantity },
      },
    });
  }

  async releaseStock(
    productId: string,
    quantity: number,
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Registro de estoque não encontrado');
    }

    const newReserved = Math.max(0, inventory.reservedQuantity - quantity);

    return this.prisma.inventory.update({
      where: { productId },
      data: {
        reservedQuantity: newReserved,
      },
    });
  }

  async confirmStockReduction(
    productId: string,
    quantity: number,
  ): Promise<Inventory> {
    return this.prisma.inventory.update({
      where: { productId },
      data: {
        quantity: { decrement: quantity },
        reservedQuantity: { decrement: quantity },
      },
    });
  }
}
