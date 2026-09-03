import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('exibe a mensagem sem botão de retry', () => {
    render(<EmptyState message="Nenhum pedido encontrado" />);
    expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('renderiza botão de retry quando fornecido', async () => {
    const onRetry = vi.fn();
    render(<EmptyState message="Falha ao carregar" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});