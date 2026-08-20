import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Address } from '@prisma/client';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(
    userId: string,
    data: {
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
  ): Promise<Address> {
    if (data.isDefault) {
      await this.clearDefaultAddress(userId);
    }

    const hasAddresses = await this.prisma.address.count({ where: { userId } });

    const address = await this.prisma.address.create({
      data: {
        userId,
        label: data.label || 'Casa',
        zipCode: data.zipCode,
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        country: data.country || 'BR',
        isDefault: data.isDefault || hasAddresses === 0,
      },
    });

    this.logger.log(`Address created for user ${userId}: ${address.id}`);
    return address;
  }

  async update(
    userId: string,
    addressId: string,
    data: {
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
  ): Promise<Address> {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    if (data.isDefault) {
      await this.clearDefaultAddress(userId);
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data,
    });

    this.logger.log(`Address updated for user ${userId}: ${addressId}`);
    return updated;
  }

  async delete(userId: string, addressId: string): Promise<void> {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    if (address.isDefault) {
      const nextAddress = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextAddress) {
        await this.prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    this.logger.log(`Address deleted for user ${userId}: ${addressId}`);
  }

  async setDefault(userId: string, addressId: string): Promise<Address> {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    await this.clearDefaultAddress(userId);

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    this.logger.log(`Default address set for user ${userId}: ${addressId}`);
    return updated;
  }

  private async clearDefaultAddress(userId: string): Promise<void> {
    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
