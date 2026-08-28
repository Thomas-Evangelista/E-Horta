import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    $transaction: jest.Mock;
    user: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };
  let audit: { record: jest.Mock };

  const customer = {
    id: 'cc000000-0000-4000-8000-000000000001',
    name: 'Maria',
    email: 'maria@example.com',
    phone: null,
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const adminUser = {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@example.com',
    phone: null,
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
    };

    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('updateStatusForAdmin', () => {
    it('deve bloquear um cliente e registrar USER_BLOCKED com contexto', async () => {
      prisma.user.findUnique.mockResolvedValue(customer);
      prisma.user.update.mockResolvedValue({ ...customer, status: 'BLOCKED' });

      const result = await service.updateStatusForAdmin('admin-1', customer.id, 'BLOCKED', {
        ip: '10.0.0.9',
        userAgent: 'jest',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: customer.id },
        data: { status: 'BLOCKED' },
        select: expect.objectContaining({ id: true, status: true }),
      });
      expect(result.status).toBe('BLOCKED');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'USER_BLOCKED',
          entity: 'User',
          entityId: customer.id,
          ip: '10.0.0.9',
          userAgent: 'jest',
          metadata: { from: 'ACTIVE', to: 'BLOCKED', email: 'maria@example.com' },
        }),
      );
    });

    it.each([
      ['INACTIVE', 'USER_INACTIVATED'],
      ['ACTIVE', 'USER_ACTIVATED'],
    ] as const)('deve mapear status %s para ação %s', async (status, action) => {
      const current =
        status === 'ACTIVE'
          ? { ...customer, status: 'INACTIVE' }
          : { ...customer, status: 'ACTIVE' };
      prisma.user.findUnique.mockResolvedValue(current);
      prisma.user.update.mockResolvedValue({ ...current, status });

      await service.updateStatusForAdmin('admin-1', customer.id, status);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          metadata: expect.objectContaining({ from: current.status, to: status }),
        }),
      );
    });

    it('deve impedir alterar o próprio usuário', async () => {
      await expect(
        service.updateStatusForAdmin('admin-1', 'admin-1', 'INACTIVE'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('deve impedir alterar perfil administrativo (ADMIN/OPERATOR)', async () => {
      prisma.user.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.updateStatusForAdmin('admin-1', adminUser.id, 'INACTIVE'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando o status já é o mesmo', async () => {
      prisma.user.findUnique.mockResolvedValue(customer);

      await expect(
        service.updateStatusForAdmin('admin-1', customer.id, 'ACTIVE'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar NotFound para usuário inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatusForAdmin('admin-1', customer.id, 'BLOCKED'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('deve excluir a conta e registrar USER_DELETED na mesma transação', async () => {
      prisma.user.findUnique.mockResolvedValue(customer);

      await service.deleteAccount(customer.id, { ip: '10.0.0.9', userAgent: 'jest' });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: customer.id } });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DELETED',
          entity: 'User',
          userId: customer.id,
          ip: '10.0.0.9',
          userAgent: 'jest',
          db: prisma,
          metadata: expect.objectContaining({ email: 'maria@example.com' }),
        }),
      );
    });

    it('deve lançar NotFound para usuário inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteAccount('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
