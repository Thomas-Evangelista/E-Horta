/** Eventos que disparam notificações (spec #16). */
export type NotificationEvent =
  | 'ACCOUNT_CREATED'
  | 'ORDER_CREATED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_FAILED'
  | 'ORDER_PREPARING'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED';

export interface NotificationEventData {
  userName?: string;
  orderNumber?: string;
  orderId?: string;
  total?: number;
  reason?: string;
}

export interface NotificationJobData {
  userId: string;
  event: NotificationEvent;
  data: NotificationEventData;
}

interface NotificationTemplate {
  title: string;
  message: string;
  emailSubject: string;
}

const formatBRL = (value: number | undefined): string =>
  value === undefined
    ? ''
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/** Templates centralizados: título/mensagem (interno) e assunto do e-mail. */
export const NOTIFICATION_TEMPLATES: Record<NotificationEvent, NotificationTemplate> = {
  ACCOUNT_CREATED: {
    title: 'Bem-vindo ao E-Horta!',
    message: 'Sua conta foi criada com sucesso. Aproveite ofertas fresquinhas!',
    emailSubject: 'Bem-vindo ao E-Horta!',
  },
  ORDER_CREATED: {
    title: 'Pedido criado',
    message: 'Pedido {orderNumber} criado. Realize o pagamento para confirmarmos sua entrega.',
    emailSubject: 'Pedido {orderNumber} recebido - E-Horta',
  },
  PAYMENT_APPROVED: {
    title: 'Pagamento aprovado',
    message: 'Pagamento do pedido {orderNumber} aprovado! Seu pedido entrará em preparo.',
    emailSubject: 'Pagamento aprovado - Pedido {orderNumber}',
  },
  PAYMENT_FAILED: {
    title: 'Pagamento não autorizado',
    message: 'O pagamento do pedido {orderNumber} falhou. Tente novamente para não perder seu pedido.',
    emailSubject: 'Problema no pagamento - Pedido {orderNumber}',
  },
  ORDER_PREPARING: {
    title: 'Pedido em preparação',
    message: 'Seu pedido {orderNumber} está sendo preparado com carinho.',
    emailSubject: 'Pedido {orderNumber} em preparação',
  },
  ORDER_OUT_FOR_DELIVERY: {
    title: 'Pedido saiu para entrega',
    message: 'Seu pedido {orderNumber} saiu para entrega. Separe as panelas!',
    emailSubject: 'Pedido {orderNumber} saiu para entrega',
  },
  ORDER_DELIVERED: {
    title: 'Pedido entregue',
    message: 'Pedido {orderNumber} entregue. Bom apetite! Avalie seus produtos.',
    emailSubject: 'Pedido {orderNumber} entregue - Bom apetite!',
  },
};

/** Preenche placeholders dos templates com os dados do evento. */
export function renderTemplate(
  event: NotificationEvent,
  data: NotificationEventData,
): NotificationTemplate {
  const template = NOTIFICATION_TEMPLATES[event];
  const total = formatBRL(data.total);
  return {
    title: template.title,
    message: template.message
      .replace('{orderNumber}', data.orderNumber ?? '')
      .replace('{total}', total),
    emailSubject: template.emailSubject.replace('{orderNumber}', data.orderNumber ?? ''),
  };
}

/** Corpo HTML simples do e-mail (sem dependências externas de template). */
export function renderEmailHtml(
  event: NotificationEvent,
  data: NotificationEventData,
): string {
  const { title, message } = renderTemplate(event, data);
  return [
    '<!DOCTYPE html>',
    '<html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#1f2937">',
    `<h2 style="color:#166534">${title}</h2>`,
    `<p>${message}</p>`,
    data.total !== undefined ? `<p><strong>Total:</strong> ${formatBRL(data.total)}</p>` : '',
    '<p style="font-size:12px;color:#6b7280">E-Horta &mdash; Fresquinho na sua porta.</p>',
    '</body></html>',
  ]
    .filter(Boolean)
    .join('\n');
}
