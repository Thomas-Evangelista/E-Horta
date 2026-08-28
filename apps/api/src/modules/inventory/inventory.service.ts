import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type Inventory } from '@prisma/client';
import {
  AuditService,
  type AuditContext,
} from '../audit/audit.service';

export interface StockOperationItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

  /**
   * Produtos com estoque disponível abaixo do mínimo configurado.
   * Prisma não suporta comparação entre colunas no `where`, então o
   * filtro (quantity - reservedQuantity <= minimumStock) é aplicado em memória.
   */
  async findLowStock() {
    const rows = await this.prisma.inventory.findMany({
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

    return rows.filter(
      (row) => row.quantity - row.reservedQuantity <= row.minimumStock,
    );
  }

  async updateStock(
    productId: string,
    data: {
      quantity?: number;
      minimumStock?: number;
    },
    ctx?: AuditContext,
  ): Promise<Inventory> {
    await this.findByProductId(productId);

    if (data.quantity !== undefined && data.quantity < 0) {
      throw new BadRequestException('Estoque não pode ser negativo');
    }

    const updated = await this.prisma.inventory.update({
      where: { productId },
      data: {
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.minimumStock !== undefined && { minimumStock: data.minimumStock }),
      },
    });

    await this.audit.record({
      ...ctx,
      action: 'STOCK_CHANGED',
      entity: 'Inventory',
      entityId: productId,
      metadata: {
        fromQuantity: updated.quantity,
        toQuantity: data.quantity ?? updated.quantity,
        ...(data.minimumStock !== undefined && {
          minimumStock: data.minimumStock,
        }),
      },
    });

    this.logger.log(
      `Inventory updated for product ${productId}: quantity=${updated.quantity}`,
    );

    return updated;
  }

  /**
   * Reserva estoque dentro de uma transação. O UPDATE condicional só escreve
   * se houver saldo disponível no momento da escrita, impedindo overselling
   * sob concorrência. Lança OUT_OF_STOCK quando qualquer item falha.
   */
  async reserveItems(
    tx: Prisma.TransactionClient,
    items: StockOperationItem[],
  ): Promise<void> {
    for (const item of items) {
      const reserved = await tx.$executeRaw`
        UPDATE "inventory"
        SET "reserved_quantity" = "reserved_quantity" + ${item.quantity},
            "updated_at" = NOW()
        WHERE "product_id" = ${item.productId}::uuid
          AND ("quantity" - "reserved_quantity") >= ${item.quantity}
      `;

      if (reserved === 0) {
        throw new ConflictException({
          code: 'OUT_OF_STOCK',
          message: `Produto "${item.name}" sem estoque disponível`,
          details: [
            { field: 'items', message: `${item.name} (SKU ${item.sku}) sem estoque` },
          ],
        });
      }
    }
  }

  /**
   * Libera reservas (pagamento recusado/cancelamento). Idempotente:
   * nunca deixa reservedQuantity negativo.
   */
  async releaseReservations(
    tx: Prisma.TransactionClient,
    items: StockOperationItem[],
  ): Promise<void> {
    for (const item of items) {
      await tx.$executeRaw`
        UPDATE "inventory"
        SET "reserved_quantity" = GREATEST(0, "reserved_quantity" - ${item.quantity}),
            "updated_at" = NOW()
        WHERE "product_id" = ${item.productId}::uuid
      `;
    }
  }

  /**
   * Confirma a baixa definitiva do estoque (pagamento aprovado):
   * converte reserva em saída efetiva de mercadoria.
   */
  async confirmReductions(
    tx: Prisma.TransactionClient,
    items: StockOperationItem[],
  ): Promise<void> {
    for (const item of items) {
      const updated = await tx.$executeRaw`
        UPDATE "inventory"
        SET "quantity" = "quantity" - ${item.quantity},
            "reserved_quantity" = GREATEST(0, "reserved_quantity" - ${item.quantity}),
            "updated_at" = NOW()
        WHERE "product_id" = ${item.productId}::uuid
          AND "reserved_quantity" >= ${item.quantity}
      `;

      if (updated === 0) {
        this.logger.warn(
          `Confirm reduction skipped for product ${item.productId}: reservation not found for quantity ${item.quantity}`,
        );
      }
    }
  }
}
