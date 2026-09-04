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

  it('renderiza nav com aria-label de paginacao', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => undefined} />);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
  });

  it('desabilita "Anterior" na primeira pagina', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  });

  it('desabilita "Proxima" na ultima pagina', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  });

  it('chama onPageChange ao navegar', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('marca a pagina atual com aria-current', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => undefined} />);
    const currentPage = screen.getByRole('button', { name: 'Página 2' });
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('nao marca paginas nao atuais com aria-current', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => undefined} />);
    const otherPage = screen.getByRole('button', { name: 'Página 1' });
    expect(otherPage).not.toHaveAttribute('aria-current');
  });

  it('mostra janela de paginas ao redor da pagina atual', () => {
    render(<Pagination page={5} totalPages={10} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 8' })).toBeInTheDocument();
  });
});
