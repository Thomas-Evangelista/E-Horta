export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Credenciais inválidas',
  FORBIDDEN: 'Sem permissão',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Dados inválidos',
  CONFLICT: 'Conflito com registro existente',
  SESSION_EXPIRED: 'Sessão expirada',
  UNKNOWN: 'Erro inesperado',
};

export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiError) return MESSAGES[err.code] ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Erro inesperado';
}
