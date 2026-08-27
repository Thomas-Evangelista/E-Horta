import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
  it('renderiza com texto', () => {
    render(<Button>Continuar</Button>);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('tipo padrão é button', () => {
    render(<Button>OK</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('propaga estado disabled', () => {
    render(<Button disabled>OK</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('loading desabilita e marca aria-busy', () => {
    render(<Button loading>OK</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('mantém variantes e tamanhos', () => {
    render(
      <>
        <Button variant="secondary" size="sm">A</Button>
        <Button size="lg">B</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'A' }).className).toContain('bg-leaf-600');
    expect(screen.getByRole('button', { name: 'A' }).className).toContain('h-9');
    expect(screen.getByRole('button', { name: 'B' }).className).toContain('h-12');
  });
});