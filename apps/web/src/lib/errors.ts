export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    options: { code?: string; status?: number; details?: Array<{ field: string; message: string }> } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.status = options.status ?? 0;
    this.details = options.details;
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  VALIDATION_ERROR: 'Verifique os dados informados e tente novamente.',
  AUTHENTICATION_ERROR: 'E-mail ou senha incorretos.',
  AUTHORIZATION_ERROR: 'Você não tem permissão para esta ação.',
  NOT_FOUND: 'Conteúdo não encontrado.',
  CONFLICT: 'Este registro já existe.',
  OUT_OF_STOCK: 'Produto sem estoque disponível.',
  PAYMENT_ERROR: 'Houve um problema no pagamento. Tente novamente.',
  SHIPPING_ERROR: 'Não foi possível calcular a entrega.',
  UNKNOWN_ERROR: 'Algo deu errado. Tente novamente em instantes.',
};

export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return FRIENDLY_MESSAGES[error.code] ?? error.message ?? FRIENDLY_MESSAGES.UNKNOWN_ERROR;
  }
  if (error instanceof Error && error.message === 'Failed to fetch') {
    return FRIENDLY_MESSAGES.NETWORK_ERROR;
  }
  return FRIENDLY_MESSAGES.UNKNOWN_ERROR;
}
