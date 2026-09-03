import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from '../pagination';

describe('Pagination', () => {
  it('não renderiza com uma única página', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={() => undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('desabilita "Anterior" na primeira página', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('desabilita "Próxima" na última página', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('chama onPageChange ao navegar', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('mostra janela de páginas ao redor da página atual', () => {
    render(<Pagination page={5} totalPages={10} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
  });
});