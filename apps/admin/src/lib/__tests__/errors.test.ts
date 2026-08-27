import { describe, expect, it } from 'vitest';
import { ApiError, friendlyMessage } from '../errors';

describe('ApiError', () => {
  it('guarda código, mensagem, status e detalhes', () => {
    const err = new ApiError('NOT_FOUND', 'Recurso não encontrado', 404, { id: 'x' });
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ id: 'x' });
  });
});

describe('friendlyMessage', () => {
  it('mapeia códigos conhecidos', () => {
    expect(friendlyMessage(new ApiError('UNAUTHORIZED', 'qualquer', 401))).toBe('Credenciais inválidas');
    expect(friendlyMessage(new ApiError('SESSION_EXPIRED', 'x', 401))).toBe('Sessão expirada');
  });

  it('usa a mensagem do erro para código desconhecido', () => {
    expect(friendlyMessage(new ApiError('CUSTOM', 'mensagem custom', 500))).toBe('mensagem custom');
  });

  it('propaga mensagem de erro comum', () => {
    expect(friendlyMessage(new Error('boom'))).toBe('boom');
  });

  it('cai no fallback para valores não-Error', () => {
    expect(friendlyMessage('nada')).toBe('Erro inesperado');
  });
});