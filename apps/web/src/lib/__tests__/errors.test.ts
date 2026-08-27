import { describe, expect, it } from 'vitest';
import { ApiError, friendlyMessage } from '../errors';

describe('ApiError', () => {
  it('usa defaults quando opções não são passadas', () => {
    const err = new ApiError('mensagem');
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.status).toBe(0);
    expect(err.name).toBe('ApiError');
  });

  it('carrega código, status e detalhes', () => {
    const err = new ApiError('x', {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: [{ field: 'email', message: 'inválido' }],
    });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
    expect(err.details).toHaveLength(1);
  });
});

describe('friendlyMessage', () => {
  it('mapeia códigos de erro conhecidos', () => {
    expect(friendlyMessage(new ApiError('x', { code: 'NETWORK_ERROR' }))).toBe(
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
    );
    expect(friendlyMessage(new ApiError('x', { code: 'OUT_OF_STOCK' }))).toBe(
      'Produto sem estoque disponível.',
    );
  });

  it('usa a mensagem original quando o código é desconhecido', () => {
    expect(friendlyMessage(new ApiError('mensagem custom', { code: 'FOO' }))).toBe('mensagem custom');
  });

  it('trata falha de fetch como erro de rede', () => {
    expect(friendlyMessage(new Error('Failed to fetch'))).toBe(
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
    );
  });

  it('cai no fallback genérico para erros desconhecidos', () => {
    expect(friendlyMessage({ whatever: true })).toBe('Algo deu errado. Tente novamente em instantes.');
  });
});