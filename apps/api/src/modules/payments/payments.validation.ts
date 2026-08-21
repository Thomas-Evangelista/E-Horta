import { z } from 'zod';

export const WEBHOOK_EVENT_TYPES = ['payment.approved', 'payment.failed'] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  createdAt?: string;
  data: {
    paymentId: string;
    providerPaymentId?: string;
    amount: number;
  };
}

export const webhookPayloadSchema = z.object({
  eventId: z.string().min(8).max(64),
  eventType: z.enum(WEBHOOK_EVENT_TYPES),
  createdAt: z.string().datetime().optional(),
  data: z.object({
    paymentId: z.string().uuid(),
    providerPaymentId: z.string().max(128).optional(),
    amount: z.number().nonnegative(),
  }),
});
