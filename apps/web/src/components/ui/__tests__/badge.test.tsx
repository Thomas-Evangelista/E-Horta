import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../badge';

describe('Badge', () => {
  it('renderiza conteúdo', () => {
    render(<Badge>Oferta</Badge>);
    expect(screen.getByText('Oferta')).toBeInTheDocument();
  });

  it('aplica classe por tom', () => {
    render(
      <>
        <Badge tone="accent">A</Badge>
        <Badge>N</Badge>
      </>,
    );
    expect(screen.getByText('A').className).toContain('bg-accent-100');
    expect(screen.getByText('N').className).toContain('bg-cream-200');
  });
});