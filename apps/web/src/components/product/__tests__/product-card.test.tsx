import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from '../product-card';
import type { Product } from '@/types/api';

const product: Product = {
  id: 'p1',
  name: 'Alface',
  slug: 'alface',
  shortDescription: 'Folhas frescas',
  unitLabel: 'unidade',
  price: 4.5,
  compareAtPrice: 6,
  imageUrl: 'http://img/alface.jpg',
  isFeatured: true,
  inStock: true,
};

const addToCart = { mutateAsync: vi.fn(), isPending: false };
const toast = vi.fn();

vi.mock('@/hooks/use-cart', () => ({
  useAddToCart: () => addToCart,
}));

vi.mock('@/components/feedback/toast', () => ({
  useToast: () => ({ toast }),
}));

describe('ProductCard', () => {
  it('renderiza nome, preço promocional e badge de desconto', () => {
    render(<ProductCard product={product} />);
    expect(screen.getAllByRole('link', { name: 'Alface' }).length).toBeGreaterThan(0);
    expect(screen.getByText('-25%')).toBeInTheDocument();
    expect(screen.getByText('R$ 4,50')).toBeInTheDocument();
    expect(screen.getByText('R$ 6,00')).toBeInTheDocument();
  });

  it('adiciona ao carrinho e exibe feedback de sucesso', async () => {
    addToCart.mutateAsync.mockResolvedValueOnce({});
    render(<ProductCard product={product} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar Alface ao carrinho' }));
    expect(addToCart.mutateAsync).toHaveBeenCalledWith({ productId: 'p1' });
    expect(toast).toHaveBeenCalledWith('success', 'Alface adicionado ao carrinho');
  });

  it('exibe toast de erro se a adição falhar', async () => {
    addToCart.mutateAsync.mockRejectedValueOnce(new Error('sem estoque'));
    render(<ProductCard product={product} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar Alface ao carrinho' }));
    expect(toast).toHaveBeenCalledWith('error', 'Algo deu errado. Tente novamente em instantes.');
  });

  it('desabilita o botão quando o produto está indisponível', () => {
    render(<ProductCard product={{ ...product, inStock: false }} />);
    expect(screen.getByRole('button', { name: 'Adicionar Alface ao carrinho' })).toBeDisabled();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });
});