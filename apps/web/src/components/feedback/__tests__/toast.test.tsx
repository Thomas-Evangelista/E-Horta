import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../toast';

function Trigger() {
  const { toast } = useToast();
  return <button onClick={() => toast('success', 'Adicionado ao carrinho')}>disparar</button>;
}

function Harness() {
  return (
    <ToastProvider>
      <Trigger />
    </ToastProvider>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('exibe a mensagem ao disparar um toast', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'disparar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Adicionado ao carrinho');
  });

  it('remove o toast automaticamente após 4s', () => {
    vi.useFakeTimers();
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'disparar' }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fecha na apresentação manual', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'disparar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('empilha até 3 toasts', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole('button', { name: 'disparar' }));
    }
    expect(screen.getAllByRole('status')).toHaveLength(3);
  });
});