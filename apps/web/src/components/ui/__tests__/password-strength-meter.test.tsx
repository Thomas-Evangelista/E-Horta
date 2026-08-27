import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordStrengthMeter } from '../password-strength-meter';

describe('PasswordStrengthMeter', () => {
  it('não renderiza nada com senha vazia', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('exibe 4 segmentos e lista de requisitos', () => {
    render(<PasswordStrengthMeter password="Senha@123" />);
    const segments = document.querySelectorAll('div[data-current], div[style*="background-color"]');
    expect(segments.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Letras maiúsculas e minúsculas')).toBeInTheDocument();
    expect(screen.getByText('Ao menos um número')).toBeInTheDocument();
    expect(screen.getByText('Um símbolo (ex.: ! @ #)')).toBeInTheDocument();
  });

  it('mostra label de força por nível', () => {
    render(<PasswordStrengthMeter password="Abcdefgh100!" />);
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('marca requisitos atendidos com ✓', () => {
    render(<PasswordStrengthMeter password="Senha@123" />);
    expect(screen.getAllByText('✓').length).toBe(4);
  });

  it('mantém aria-live e role status acessíveis', () => {
    render(<PasswordStrengthMeter password="abc" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('Fraca'));
  });
});