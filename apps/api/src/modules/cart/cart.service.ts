import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type CartStatus, type ProductUnit } from '@prisma/client';
import type { AddItemDto, UpdateItemDto } from './cart.validation';

export type CartOwner =
  | { kind: 'user'; userId: string }
  | { kind: 'anonymous'; cartId: string };

const CART_TOKEN_PURPOSE = 'cart';
const CART_TOKEN_EXPIRES_IN = '30d';

export interface CartItemResponse {
  id: string;
  productId: string;
  name: string;
  slug: string;
  sku: string;
  unit: ProductUnit;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  availableStock: number;
  hasEnoughStock: boolean;
}

export interface CartResponse {
  id: string;
  status: CartStatus;
  items: CartItemResponse[];
  distinctItems: number;
  itemCount: number;
  subtotal: number;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Emite um token assinado (identificador seguro) que o cliente anônimo
   * apresenta no header `x-cart-token` para acessar o próprio carrinho.
   */
  async issueCartToken(cartId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: cartId, purpose: CART_TOKEN_PURPOSE },
      { expiresIn: CART_TOKEN_EXPIRES_IN },
    );
  }

  /**
   * Valida o token do carrinho anônimo e retorna o id do carrinho,
   * ou null quando o token é inválido, expirado ou de outro propósito.
   */
  async verifyCartToken(token: string): Promise<string | null> {
    try {
      const payload = this.jwtService.verify<{ sub?: unknown; purpose?: unknown }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (
        payload.purpose !== CART_TOKEN_PURPOSE ||
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0
      ) {
        return null;
      }

      return payload.sub;
    } catch {
      return null;
    }
  }

  async createAnonymousCart(): Promise<{ id: string }> {
    return this.prisma.cart.create({
      data: { userId: null, status: 'ACTIVE' },
      select: { id: true },
    });
  }

  async getCart(owner: CartOwner): Promise<CartResponse> {
    const cart = await this.resolveActiveCart(owner);
    return this.buildCartResponse(cart.id);
  }

  async addItem(owner: CartOwner, dto: AddItemDto): Promise<CartResponse> {
    const cart = await this.resolveActiveCart(owner);

    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        include: { inventory: true },
      });

      if (!product || !product.isActive) {
        throw new NotFoundException('Produto não encontrado ou indisponível');
      }

      const available = this.getAvailableStock(product.inventory);
      const existingItem = await tx.cartItem.findFirst({
        where: { cartId: cart.id, productId: dto.productId },
      });

      const inCart = existingItem?.quantity ?? 0;
      const requestedTotal = inCart + dto.quantity;

      if (requestedTotal > available) {
        throw new BadRequestException(
          `Estoque insuficiente para "${product.name}". Disponível: ${available}, no carrinho: ${inCart}, solicitado: ${requestedTotal}`,
        );
      }

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: requestedTotal, unitPrice: product.price },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            quantity: dto.quantity,
            unitPrice: product.price,
          },
        });
      }
    });

    this.logger.log(`Item added to cart ${cart.id}: product ${dto.productId}`);
    return this.getCart(owner);
  }

  async updateItemQuantity(
    owner: CartOwner,
    itemId: string,
    dto: UpdateItemDto,
  ): Promise<CartResponse> {
    const cart = await this.resolveActiveCart(owner);

    await this.prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId: cart.id },
        include: { product: { include: { inventory: true } } },
      });

      if (!item) {
        throw new NotFoundException('Item não encontrado no carrinho');
      }

      if (!item.product.isActive) {
        throw new BadRequestException('Produto indisponível');
      }

      const available = this.getAvailableStock(item.product.inventory);

      if (dto.quantity > available) {
        throw new BadRequestException(
          `Estoque insuficiente para "${item.product.name}". Disponível: ${available}, solicitado: ${dto.quantity}`,
        );
      }

      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity: dto.quantity, unitPrice: item.product.price },
      });
    });

    return this.getCart(owner);
  }

  async removeItem(owner: CartOwner, itemId: string): Promise<CartResponse> {
    const cart = await this.resolveActiveCart(owner);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Item não encontrado no carrinho');
    }

    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.getCart(owner);
  }

  async clearCart(owner: CartOwner): Promise<CartResponse> {
    const cart = await this.resolveActiveCart(owner);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(owner);
  }

  /**
   * Mescla o carrinho anônimo no carrinho ativo do usuário após o login.
   * Conflitos de quantidade são resolvidos respeitando o estoque disponível
   * e produtos indisponíveis são descartados. O carrinho anônimo é marcado
   * como ABANDONED para não ser reutilizado.
   */
  async mergeAnonymousCart(userId: string, anonymousCartId: string): Promise<CartResponse> {
    const anonymousCart = await this.prisma.cart.findFirst({
      where: { id: anonymousCartId, userId: null, status: 'ACTIVE' },
      include: { items: true },
    });

    const userCart = await this.getOrCreateActiveCart(userId);

    if (!anonymousCart || anonymousCart.items.length === 0) {
      return this.buildCartResponse(userCart.id);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const anonymousItem of anonymousCart.items) {
        const product = await tx.product.findUnique({
          where: { id: anonymousItem.productId },
          include: { inventory: true },
        });

        if (!product || !product.isActive) {
          continue;
        }

        const available = this.getAvailableStock(product.inventory);
        if (available <= 0) {
          continue;
        }

        const existingItem = await tx.cartItem.findFirst({
          where: { cartId: userCart.id, productId: anonymousItem.productId },
        });

        const currentQuantity = existingItem?.quantity ?? 0;
        const finalQuantity = Math.min(currentQuantity + anonymousItem.quantity, available);

        if (existingItem) {
          if (finalQuantity !== currentQuantity) {
            await tx.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: finalQuantity, unitPrice: product.price },
            });
          }
        } else {
          await tx.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: anonymousItem.productId,
              quantity: finalQuantity,
              unitPrice: product.price,
            },
          });
        }
      }

      await tx.cart.update({
        where: { id: anonymousCart.id },
        data: { status: 'ABANDONED' },
      });
    });

    this.logger.log(`Anonymous cart ${anonymousCart.id} merged into cart of user ${userId}`);
    return this.buildCartResponse(userCart.id);
  }

  /**
   * Ponto de integração com o login: valida o token do carrinho anônimo e
   * executa o merge. Falhas de validação/merge nunca devem bloquear o login.
   */
  async mergeOnLogin(userId: string, cartToken: string): Promise<CartResponse | null> {
    const anonymousCartId = await this.verifyCartToken(cartToken);

    if (!anonymousCartId) {
      return null;
    }

    try {
      return await this.mergeAnonymousCart(userId, anonymousCartId);
    } catch (error) {
      this.logger.warn(
        `Failed to merge anonymous cart on login for user ${userId}: ${String(error)}`,
      );
      return null;
    }
  }

  private async getOrCreateActiveCart(userId: string) {
    const activeCart = await this.prisma.cart.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (activeCart) {
      return activeCart;
    }

    return this.prisma.cart.create({
      data: { userId, status: 'ACTIVE' },
    });
  }

  private async resolveActiveCart(owner: CartOwner) {
    if (owner.kind === 'user') {
      return this.getOrCreateActiveCart(owner.userId);
    }

    const anonymousCart = await this.prisma.cart.findFirst({
      where: { id: owner.cartId, userId: null, status: 'ACTIVE' },
    });

    if (anonymousCart) {
      return anonymousCart;
    }

    // Token válido apontando para carrinho inexistente/encerrado: cria um novo.
    return this.prisma.cart.create({
      data: { userId: null, status: 'ACTIVE' },
    });
  }

  private getAvailableStock(inventory: { quantity: number; reservedQuantity: number } | null): number {
    if (!inventory) {
      return 0;
    }
    return Math.max(0, inventory.quantity - inventory.reservedQuantity);
  }

  private async buildCartResponse(cartId: string): Promise<CartResponse> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      select: {
        id: true,
        status: true,
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            productId: true,
            quantity: true,
            product: {
              select: {
                name: true,
                slug: true,
                sku: true,
                unit: true,
                imageUrl: true,
                isActive: true,
                price: true,
                inventory: {
                  select: { quantity: true, reservedQuantity: true },
                },
              },
            },
          },
        },
      },
    });

    const items: CartItemResponse[] = [];
    let subtotal = new Prisma.Decimal(0);
    let itemCount = 0;

    for (const item of cart.items) {
      // Preço sempre recalculado pelo backend a partir do preço atual do produto.
      const unitPrice = new Prisma.Decimal(item.product.price);
      const totalPrice = unitPrice.mul(item.quantity);
      const availableStock = this.getAvailableStock(item.product.inventory);

      subtotal = subtotal.plus(totalPrice);
      itemCount += item.quantity;

      items.push({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        sku: item.product.sku,
        unit: item.product.unit,
        imageUrl: item.product.imageUrl,
        unitPrice: unitPrice.toNumber(),
        quantity: item.quantity,
        totalPrice: totalPrice.toNumber(),
        availableStock,
        hasEnoughStock: item.product.isActive && item.quantity <= availableStock,
      });
    }

    return {
      id: cart.id,
      status: cart.status,
      items,
      distinctItems: items.length,
      itemCount,
      subtotal: subtotal.toDecimalPlaces(2).toNumber(),
    };
  }
}
