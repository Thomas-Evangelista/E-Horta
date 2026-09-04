import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../confirm-dialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Remover item',
    message: 'Tem certeza que deseja remover?',
  };

  it('renderiza titulo e mensagem quando aberto', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Remover item')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza que deseja remover?')).toBeInTheDocument();
  });

  it('nao renderiza quando fechado', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Remover item')).not.toBeInTheDocument();
  });

  it('chama onConfirm ao clicar no botao de confirmar', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no botao de cancelar', async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exibe label customizado no botao de confirmar', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Deletar" />);
    expect(screen.getByRole('button', { name: 'Deletar' })).toBeInTheDocument();
  });

  it('possui role alertdialog e aria-modal', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('chama onClose ao clicar no backdrop', async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    await userEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
