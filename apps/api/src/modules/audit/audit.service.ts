import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Contexto originado no request HTTP (quem e de onde). */
export interface AuditContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
}

type AuditDb = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma entrada de auditoria. Aceita um client de transação opcional
   * para que a escrita participe do mesmo commit que a mutação auditada.
   */
  async record(
    opts: AuditContext & {
      action: string;
      entity: string;
      entityId: string;
      metadata?: Record<string, unknown>;
      db?: AuditDb;
    },
  ): Promise<void> {
    const client = opts.db ?? this.prisma;
    await client.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        metadata: (opts.metadata ?? {}) as Prisma.InputJsonValue,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
  }

  /** Listagem paginada de registros de auditoria (painel admin). */
  async findAll(filters: { page?: number; limit?: number; action?: string } = {}): Promise<{
    items: Array<{
      id: string;
      userId: string | null;
      userEmail: string | null;
      action: string;
      entity: string;
      entityId: string;
      metadata: unknown;
      ip: string | null;
      userAgent: string | null;
      createdAt: Date;
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const safeLimit = Math.min(Math.max(1, filters.limit ?? 20), 100);
    const safePage = Math.max(1, filters.page ?? 1);

    const where: Prisma.AuditLogWhereInput = filters.action ? { action: filters.action } : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { user: { select: { email: true } } },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userEmail: row.user?.email ?? null,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        metadata: row.metadata,
        ip: row.ip,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      })),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }
}
