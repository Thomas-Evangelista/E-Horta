import { ApiError } from './errors';

/**
 * Converte erros de validação da API (`details[].field`) em erros de campo
 * do React Hook Form, para feedback inline no formulário correto.
 */
export function applyApiFieldErrors(
  error: unknown,
  setError: (field: string, error: { message: string }) => void,
  fallbackMessage?: string,
): boolean {
  if (!(error instanceof ApiError)) return false;

  if (error.details && error.details.length > 0) {
    let mapped = 0;
    for (const detail of error.details) {
      if (detail.field) {
        setError(detail.field, { message: detail.message });
        mapped++;
      }
    }
    if (mapped > 0) return true;
  }

  // Erros de negócio mapeados para campos conhecidos
  const FIELD_BY_CODE: Record<string, string> = {
    CONFLICT: /elefone/.test(error.message) ? 'phone' : 'email',
    EMAIL_ALREADY_EXISTS: 'email',
    USER_ALREADY_EXISTS: 'email',
    AUTHENTICATION_ERROR: 'password',
    INVALID_CREDENTIALS: 'password',
  };

  const field = FIELD_BY_CODE[error.code];
  if (field) {
    setError(field, { message: error.message });
    return true;
  }

  if (fallbackMessage) {
    setError('root', { message: fallbackMessage });
    return true;
  }
  return false;
}
