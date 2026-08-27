import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../errors';
import { applyApiFieldErrors } from '../form-errors';

function makeSetError() {
  return vi.fn<(field: string, error: { message: string }) => void>();
}

describe('applyApiFieldErrors', () => {
  it('não faz nada para erros que não são ApiError', () => {
    const setError = makeSetError();
    expect(applyApiFieldErrors(new Error('x'), setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('mapeia details[].field para os campos do formulário', () => {
    const setError = makeSetError();
    const err = new ApiError('inválido', {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: [
        { field: 'email', message: 'E-mail inválido' },
        { field: 'password', message: 'Mínimo 8 caracteres' },
      ],
    });
    expect(applyApiFieldErrors(err, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith('email', { message: 'E-mail inválido' });
    expect(setError).toHaveBeenCalledWith('password', { message: 'Mínimo 8 caracteres' });
  });

  it('mapeia CONFLICT de telefone para o campo phone', () => {
    const setError = makeSetError();
    const err = new ApiError('Telefone já cadastrado', { code: 'CONFLICT' });
    expect(applyApiFieldErrors(err, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith('phone', { message: 'Telefone já cadastrado' });
  });

  it('mapeia CONFLICT comum para o campo email', () => {
    const setError = makeSetError();
    const err = new ApiError('E-mail já cadastrado', { code: 'CONFLICT' });
    expect(applyApiFieldErrors(err, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith('email', { message: 'E-mail já cadastrado' });
  });

  it('mapeia credenciais inválidas para o campo password', () => {
    const setError = makeSetError();
    const err = new ApiError('Credenciais inválidas', { code: 'INVALID_CREDENTIALS' });
    expect(applyApiFieldErrors(err, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith('password', { message: 'Credenciais inválidas' });
  });

  it('mapeia email duplicado para o campo email', () => {
    const setError = makeSetError();
    const err = new ApiError('já existe', { code: 'EMAIL_ALREADY_EXISTS' });
    expect(applyApiFieldErrors(err, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith('email', expect.anything());
  });

  it('usa fallback em root quando nenhuma regra mapeia', () => {
    const setError = makeSetError();
    const err = new ApiError('algo deu errado', { code: 'UNKNOWN' });
    expect(applyApiFieldErrors(err, setError, 'mensagem genérica')).toBe(true);
    expect(setError).toHaveBeenCalledWith('root', { message: 'mensagem genérica' });
  });

  it('retorna false sem fallback quando nada mapeia', () => {
    const setError = makeSetError();
    const err = new ApiError('algo deu errado', { code: 'UNKNOWN' });
    expect(applyApiFieldErrors(err, setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});