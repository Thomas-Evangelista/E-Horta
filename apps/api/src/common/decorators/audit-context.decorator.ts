import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuditContext as AuditRequestContext } from '../../modules/audit/audit.service';

/**
 * Extrai o contexto de auditoria do request atual: id do usuário autenticado,
 * endereço IP e user-agent (usado em registros de auditoria, spec §47).
 */
export const AuditContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuditRequestContext => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: { id?: string } }>();
    return {
      userId: request.user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  },
);
