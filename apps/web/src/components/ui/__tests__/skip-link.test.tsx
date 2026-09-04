import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkipLink } from '../skip-link';

describe('SkipLink', () => {
  it('renderiza link para pular ao conteudo principal', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Pular para o conteúdo principal' });
    expect(link).toHaveAttribute('href', '#conteudo-principal');
  });

  it('comeca invisivel (sr-only) e fica visivel ao focar', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Pular para o conteúdo principal' });
    expect(link.className).toContain('sr-only');
    link.focus();
    expect(link.className).toContain('focus:not-sr-only');
  });
});
