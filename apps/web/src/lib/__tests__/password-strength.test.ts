import { describe, expect, it } from 'vitest';
import { evaluatePasswordStrength } from '../password-strength';

describe('evaluatePasswordStrength', () => {
  it('vazia é "empty" sem label', () => {
    const result = evaluatePasswordStrength('');
    expect(result.strength).toBe('empty');
    expect(result.score).toBe(0);
    expect(result.label).toBe('');
  });

  it('senha muito curta é fraca', () => {
    expect(evaluatePasswordStrength('abc').strength).toBe('weak');
  });

  it('cumpre só 1 requisito (comprimento) é fraca', () => {
    expect(evaluatePasswordStrength('abcdefgh').strength).toBe('weak');
  });

  it('cumpre 3 requisitos (sem símbolo) é média', () => {
    const result = evaluatePasswordStrength('Abcdefg1');
    expect(result.strength).toBe('medium');
    expect(result.score).toBe(3);
    expect(result.label).toBe('Média');
  });

  it('cumpre todos os 4 requisitos sem bonus de tamanho é média', () => {
    const result = evaluatePasswordStrength('Senha@123');
    expect(result.strength).toBe('medium');
    expect(result.score).toBe(4);
  });

  it('é forte somente com 4 requisitos + bônus de 12+ caracteres', () => {
    const result = evaluatePasswordStrength('Abcdefgh100!');
    expect(result.score).toBe(5);
    expect(result.strength).toBe('strong');
    expect(result.label).toBe('Forte');
  });

  it('exige símbolo para pontuar em todos os requisitos', () => {
    const result = evaluatePasswordStrength('Senha1234');
    expect(result.strength).not.toBe('strong');
    expect(result.requirements.at(-1)?.met).toBe(false);
  });

  it('define aria e cor por nível', () => {
    expect(evaluatePasswordStrength('Abcdefgh100!').aria).toContain('Forte');
    expect(evaluatePasswordStrength('Abcdefgh100!').color).toMatch(/^#/);
  });
});