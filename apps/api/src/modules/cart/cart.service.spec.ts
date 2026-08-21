import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CartService } from './cart.service';
import { PrismaService } from '../../database/prisma.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cart: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    cartItem: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    product: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };

  const userId = 'user-1';

  const makeProduct = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'product-1',
    name: 'Alface',
    slug: 'alface',
    sku: 'ALF-001',
    unit: 'UN',
    imageUrl: null,
    isActive: true,
    price: new Prisma.Decimal('6.90'),
    inventory: { quantity: 10, reservedQuantity: 2 },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      cart: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-cart-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(CartService);

    // Por padrão, o usuário já possui um carrinho ativo.
    prisma.cart.findFirst.mockResolvedValue({ id: 'cart-1', userId, status: 'ACTIVE' });
  });

  describe('getCart', () => {
    it('deve retornar carrinho vazio com subtotal zero', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
      });

      const result = await service.getCart({ kind: 'user', userId });

      expect(result).toMatchObject({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
        distinctItems: 0,
        itemCount: 0,
        subtotal: 0,
      });
    });

    it('deve recalcular preços e totais a partir do preço atual dos produtos', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 3,
            product: makeProduct(),
          },
          {
            id: 'item-2',
            productId: 'product-2',
            quantity: 2,
            product: makeProduct({
              id: 'product-2',
              name: 'Tomate',
              slug: 'tomate',
              price: new Prisma.Decimal('4.50'),
              inventory: { quantity: 5, reservedQuantity: 0 },
            }),
          },
        ],
      });

      const result = await service.getCart({ kind: 'user', userId });

      // 3 × 6.90 + 2 × 4.50 = 20.70 + 9.00 = 29.70
      expect(result.subtotal).toBe(29.7);
      expect(result.itemCount).toBe(5);
      expect(result.distinctItems).toBe(2);
      expect(result.items[0].unitPrice).toBe(6.9);
      expect(result.items[0].totalPrice).toBe(20.7);
      expect(result.items[0].availableStock).toBe(8);
      expect(result.items[0].hasEnoughStock).toBe(true);
    });

    it('deve marcar hasEnoughStock=false quando quantidade excede estoque disponível', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 10,
            product: makeProduct(),
          },
        ],
      });

      const result = await service.getCart({ kind: 'user', userId });

      expect(result.items[0].hasEnoughStock).toBe(false);
    });

    it('deve resolver o carrinho anônimo pelo id do token válido', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        id: 'anon-cart-1',
        userId: null,
        status: 'ACTIVE',
      });
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'anon-cart-1',
        status: 'ACTIVE',
        items: [],
      });

      const result = await service.getCart({ kind: 'anonymous', cartId: 'anon-cart-1' });

      expect(prisma.cart.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: null, status: 'ACTIVE' }),
        }),
      );
      expect(result.id).toBe('anon-cart-1');
    });

    it('deve criar novo carrinho anônimo quando o id do token não corresponde a um carrinho ativo', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({ id: 'anon-cart-novo', userId: null, status: 'ACTIVE' });
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'anon-cart-novo',
        status: 'ACTIVE',
        items: [],
      });

      const result = await service.getCart({ kind: 'anonymous', cartId: 'cart-inexistente' });

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: null, status: 'ACTIVE' } }),
      );
      expect(result.id).toBe('anon-cart-novo');
    });
  });

  describe('addItem', () => {
    it('deve adicionar item novo com o preço atual do produto', async () => {
      const product = makeProduct();
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            product,
          },
        ],
      });

      await service.addItem({ kind: 'user', userId }, { productId: 'product-1', quantity: 2 });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'product-1',
          quantity: 2,
          unitPrice: new Prisma.Decimal('6.90'),
        },
      });
    });

    it('deve incrementar quantidade quando produto já está no carrinho', async () => {
      const product = makeProduct();
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', quantity: 2 });
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
      });

      await service.addItem({ kind: 'user', userId }, { productId: 'product-1', quantity: 3 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5, unitPrice: new Prisma.Decimal('6.90') },
      });
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando produto não existe ou está inativo', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

      await expect(
        service.addItem({ kind: 'user', userId }, { productId: 'product-x', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando estoque é insuficiente considerando itens já no carrinho', async () => {
      // Disponível = 10 - 2 = 8; já há 5 no carrinho; solicitando +4 → 9 > 8
      const product = makeProduct();
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', quantity: 5 });
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

      await expect(
        service.addItem({ kind: 'user', userId }, { productId: 'product-1', quantity: 4 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.cartItem.create).not.toHaveBeenCalled();
      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });
  });

  describe('updateItemQuantity', () => {
    it('deve atualizar a quantidade e sincronizar o preço atual', async () => {
      const product = makeProduct();
      prisma.cartItem.findFirst
        .mockResolvedValueOnce({
          id: 'item-1',
          quantity: 2,
          product,
        })
        .mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
      });

      await service.updateItemQuantity({ kind: 'user', userId }, 'item-1', { quantity: 4 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 4, unitPrice: new Prisma.Decimal('6.90') },
      });
    });

    it('deve lançar NotFoundException quando item não pertence ao carrinho do usuário', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

      await expect(
        service.updateItemQuantity({ kind: 'user', userId }, 'item-outro', { quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando quantidade excede estoque disponível', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        quantity: 1,
        product: makeProduct(), // disponível = 8
      });
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

      await expect(
        service.updateItemQuantity({ kind: 'user', userId }, 'item-1', { quantity: 9 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('deve remover item do carrinho do usuário', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1' });
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
      });

      await service.removeItem({ kind: 'user', userId }, 'item-1');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    });

    it('deve lançar NotFoundException quando item não pertence ao usuário', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem({ kind: 'user', userId }, 'item-outro'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearCart', () => {
    it('deve remover todos os itens do carrinho', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
      });

      await service.clearCart({ kind: 'user', userId });

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });
  });

  describe('tokens de carrinho anônimo', () => {
    it('issueCartToken deve assinar token com propósito "cart"', async () => {
      const token = await service.issueCartToken('anon-cart-1');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'anon-cart-1', purpose: 'cart' },
        { expiresIn: '30d' },
      );
      expect(token).toBe('signed-cart-token');
    });

    it('verifyCartToken deve retornar o sub para token válido de carrinho', async () => {
      jwtService.verify.mockReturnValue({ sub: 'anon-cart-1', purpose: 'cart' });

      const cartId = await service.verifyCartToken('token-valido');

      expect(cartId).toBe('anon-cart-1');
      expect(jwtService.verify).toHaveBeenCalledWith('token-valido', {
        secret: 'test-jwt-secret',
      });
    });

    it('verifyCartToken deve rejeitar token com propósito diferente', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', purpose: 'access' });

      expect(await service.verifyCartToken('token-access')).toBeNull();
    });

    it('verifyCartToken deve retornar null para token inválido/expirado', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(await service.verifyCartToken('token-expirado')).toBeNull();
    });
  });

  describe('mergeAnonymousCart', () => {
    const anonymousCartId = 'anon-cart-1';

    beforeEach(() => {
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
      });
    });

    it('deve mesclar itens somando quantidades e sincronizando preços', async () => {
      const product = makeProduct(); // disponível = 8
      prisma.cart.findFirst
        .mockResolvedValueOnce({
          id: anonymousCartId,
          userId: null,
          status: 'ACTIVE',
          items: [{ id: 'anon-item-1', productId: 'product-1', quantity: 3 }],
        })
        .mockResolvedValueOnce({ id: 'cart-1', userId, status: 'ACTIVE' }); // carrinho do usuário
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-user-1', quantity: 2 });

      await service.mergeAnonymousCart(userId, anonymousCartId);

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-user-1' },
        data: { quantity: 5, unitPrice: new Prisma.Decimal('6.90') },
      });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: anonymousCartId },
        data: { status: 'ABANDONED' },
      });
    });

    it('deve limitar a quantidade ao estoque disponível em caso de conflito', async () => {
      const product = makeProduct(); // disponível = 8
      prisma.cart.findFirst
        .mockResolvedValueOnce({
          id: anonymousCartId,
          userId: null,
          status: 'ACTIVE',
          items: [{ id: 'anon-item-1', productId: 'product-1', quantity: 9 }],
        })
        .mockResolvedValueOnce({ id: 'cart-1', userId, status: 'ACTIVE' });
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-user-1', quantity: 4 });

      await service.mergeAnonymousCart(userId, anonymousCartId);

      // min(4 + 9, 8) = 8
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-user-1' },
        data: { quantity: 8, unitPrice: new Prisma.Decimal('6.90') },
      });
    });

    it('deve descartar produtos inativos ou sem estoque', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce({
          id: anonymousCartId,
          userId: null,
          status: 'ACTIVE',
          items: [
            { id: 'anon-item-1', productId: 'product-inativo', quantity: 2 },
            { id: 'anon-item-2', productId: 'product-sem-estoque', quantity: 1 },
          ],
        })
        .mockResolvedValueOnce({ id: 'cart-1', userId, status: 'ACTIVE' });
      prisma.product.findUnique
        .mockResolvedValueOnce(makeProduct({ id: 'product-inativo', isActive: false }))
        .mockResolvedValueOnce(
          makeProduct({
            id: 'product-sem-estoque',
            inventory: { quantity: 3, reservedQuantity: 3 },
          }),
        );

      await service.mergeAnonymousCart(userId, anonymousCartId);

      expect(prisma.cartItem.create).not.toHaveBeenCalled();
      expect(prisma.cartItem.update).not.toHaveBeenCalled();
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: anonymousCartId },
        data: { status: 'ABANDONED' },
      });
    });

    it('deve apenas retornar o carrinho do usuário quando o anônimo não existe ou está vazio', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'cart-1', userId, status: 'ACTIVE' });

      const result = await service.mergeAnonymousCart(userId, anonymousCartId);

      expect(result.id).toBe('cart-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });
  });

  describe('mergeOnLogin', () => {
    it('deve executar o merge quando o token é válido', async () => {
      jwtService.verify.mockReturnValue({ sub: 'anon-cart-1', purpose: 'cart' });
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
      prisma.cart.findFirst
        .mockResolvedValueOnce(null) // anon lookup dentro do merge
        .mockResolvedValueOnce({ id: 'cart-1', userId, status: 'ACTIVE' });
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        items: [],
      });

      const result = await service.mergeOnLogin(userId, 'token-valido');

      expect(result?.id).toBe('cart-1');
    });

    it('deve retornar null sem falhar quando o token é inválido', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = await service.mergeOnLogin(userId, 'token-invalido');

      expect(result).toBeNull();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
