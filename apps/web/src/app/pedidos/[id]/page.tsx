'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, ChevronLeft, Circle, MessageSquareHeart, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { formatDate, formatPrice } from '@/lib/format';
import { buildTimeline, isOrderCancelled, isOrderDone, orderStatusLabel } from '@/lib/order-status';
import { useCancelOrder, useOrder, useRepeatOrder } from '@/hooks/use-orders';
import { useSessionStore } from '@/stores/session';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CASH: 'Dinheiro na entrega',
};

function paymentMethodLabel(method: string | undefined): string {
  return PAYMENT_METHOD_LABELS[method ?? ''] ?? method ?? '—';
}

export default function PedidoDetalhePage() {
  const params = useParams<{ id: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { toast } = useToast();
  const user = useSessionStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !user) router.replace(`/login?redirect=${encodeURIComponent(`/pedidos/${orderId}`)}`);
  }, [hydrated, user, orderId, router]);

  const { data: order, isLoading, isError, error } = useOrder(hydrated && user ? orderId : null);
  const cancelOrder = useCancelOrder(orderId);
  const repeatOrder = useRepeatOrder(orderId);

  async function handleCancel() {
    try {
      await cancelOrder.mutateAsync(cancelReason.trim() || undefined);
      setShowCancelForm(false);
      setCancelReason('');
      toast('success', 'Pedido cancelado.');
    } catch (cancelError) {
      toast('error', friendlyMessage(cancelError));
    }
  }

  async function handleRepeat() {
    try {
      const result = await repeatOrder.mutateAsync();
      const addedCount = result.addedItems.length;
      const skippedCount = result.skippedItems.length;
      if (addedCount > 0 && skippedCount === 0) {
        toast('success', `${addedCount} ${addedCount === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho!`);
      } else if (addedCount > 0) {
        toast('success', `${addedCount} ${addedCount === 1 ? 'item adicionado' : 'itens adicionados'}. ${skippedCount} indisponí${skippedCount === 1 ? 'vel' : 'veis'}.`);
      } else {
        toast('error', 'Nenhum item deste pedido está disponível no momento.');
      }
      if (addedCount > 0) router.push('/carrinho');
    } catch (repeatError) {
      toast('error', friendlyMessage(repeatError));
    }
  }

  if (!hydrated || !user || (isLoading && !isError)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-8" aria-busy="true">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
        <span aria-hidden className="text-5xl">
          🥀
        </span>
        <h1 className="text-xl font-bold text-ink-900">Pedido não encontrado</h1>
        <p role="alert" className="max-w-xs text-sm text-ink-500">
          {friendlyMessage(error)}
        </p>
        <Link
          href="/pedidos"
          className="mt-1 inline-flex h-11 items-center rounded-pill bg-accent-500 px-6 text-sm font-bold text-white hover:bg-accent-600"
        >
          Meus pedidos
        </Link>
      </div>
    );
  }

  const timeline = buildTimeline(order.status);
  const cancelled = isOrderCancelled(order.status);
  const delivered = isOrderDone(order.status);
  const address = order.addressSnapshot;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-6">
      <Link
        href="/pedidos"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-500 hover:text-accent-600"
      >
        <ChevronLeft size={16} aria-hidden />
        Meus pedidos
      </Link>

      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold text-ink-900">{order.orderNumber}</h1>
          <span
            className={`rounded-pill px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
              cancelled
                ? 'bg-red-50 text-red-600'
                : delivered
                  ? 'bg-leaf-50 text-leaf-700'
                  : 'bg-accent-50 text-accent-700'
            }`}
          >
            {orderStatusLabel(order.status)}
          </span>
        </div>
        <p className="text-xs text-ink-400">Realizado em {formatDate(order.createdAt)}</p>
      </header>

      {cancelled ? (
        <section
          aria-label="Pedido cancelado"
          className="rounded-card border border-red-100 bg-red-50/60 p-4"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <Ban size={16} aria-hidden /> Pedido cancelado
            {order.cancelledAt && <span className="font-normal">em {formatDate(order.cancelledAt)}</span>}
          </p>
          {order.cancellationReason && (
            <p className="mt-1 text-sm text-red-600/90">Motivo: {order.cancellationReason}</p>
          )}
        </section>
      ) : (
        timeline && (
          <nav aria-label="Progresso do pedido" className="rounded-card border border-cream-200 bg-white p-4">
            <ol className="flex flex-col gap-0">
              {timeline.map((stage, index) => (
                <li key={stage.label} className="relative flex items-start gap-3 pb-4 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-[9px] top-5 h-[calc(100%-12px)] w-0.5 ${
                        stage.done ? 'bg-leaf-400' : 'bg-cream-200'
                      }`}
                    />
                  )}
                  {stage.done ? (
                    <CheckCircle2 size={20} aria-hidden className="z-10 mt-0.5 shrink-0 text-leaf-600" />
                  ) : stage.current ? (
                    <span
                      aria-hidden
                      className="z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
                    >
                      <motion.span
                        className="absolute h-3.5 w-3.5 rounded-full bg-accent-500"
                        animate={{ scale: [1, 1.25, 1] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                      />
                      <span className="h-5 w-5 rounded-full border-2 border-accent-200" />
                    </span>
                  ) : (
                    <Circle size={20} aria-hidden className="z-10 mt-0.5 shrink-0 text-cream-300" />
                  )}
                  <span
                    className={`text-sm ${
                      stage.current
                        ? 'font-bold text-ink-900'
                        : stage.done
                          ? 'font-medium text-ink-600'
                          : 'text-ink-400'
                    }`}
                    aria-current={stage.current ? 'step' : undefined}
                  >
                    {stage.label}
                  </span>
                </li>
              ))}
            </ol>
            {order.shipping?.estimatedDays != null && (
              <p className="mt-3 border-t border-cream-100 pt-3 text-xs text-ink-500">
                Entrega estimada em até {order.shipping.estimatedDays}{' '}
                {order.shipping.estimatedDays === 1 ? 'dia útil' : 'dias úteis'} após a aprovação.
              </p>
            )}
          </nav>
        )
      )}

      <section aria-labelledby="itens-heading" className="rounded-card border border-cream-200 bg-white p-4">
        <h2 id="itens-heading" className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">
          Itens
        </h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => (
            <li key={item.sku} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3">
                {item.slug ? (
                  <Link
                    href={`/produtos/${item.slug}`}
                    className="min-w-0 truncate text-sm font-semibold text-ink-800 hover:text-accent-600"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate text-sm font-semibold text-ink-800">{item.name}</span>
                )}
                <span className="shrink-0 text-sm font-bold text-ink-900">{formatPrice(item.total)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-ink-400">
                  {item.quantity} × {formatPrice(item.unitPrice)}
                </span>
                {delivered && item.slug && (
                  <Link
                    href={`/produtos/${item.slug}?avaliar=1#avaliar`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline"
                  >
                    <MessageSquareHeart size={14} aria-hidden />
                    Avaliar
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-4 flex flex-col gap-1.5 border-t border-cream-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">Subtotal</dt>
            <dd className="font-medium">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-leaf-700">
              <dt>Desconto</dt>
              <dd className="font-medium">-{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-500">Frete</dt>
            <dd className="font-medium">
              {order.shippingFee === 0 ? 'Grátis' : formatPrice(order.shippingFee)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-cream-100 pt-2">
            <dt className="font-bold text-ink-900">Total</dt>
            <dd className="text-base font-extrabold text-accent-600">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      {(address || order.payment) && (
        <section aria-labelledby="entrega-pagamento-heading" className="flex flex-col gap-3 sm:flex-row">
          {address && (
            <div className="flex-1 rounded-card border border-cream-200 bg-white p-4">
              <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Entrega</h2>
              <address className="text-sm not-italic leading-relaxed text-ink-600">
                {address.street && (
                  <>
                    {address.street}, {address.number}
                    {address.complement ? ` — ${address.complement}` : ''}
                    <br />
                  </>
                )}
                {[address.neighborhood, address.city, address.state].filter(Boolean).join(' · ')}
                {address.zipCode && (
                  <>
                    <br />
                    CEP {address.zipCode}
                  </>
                )}
              </address>
            </div>
          )}
          {order.payment && (
            <div className="flex-1 rounded-card border border-cream-200 bg-white p-4">
              <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Pagamento</h2>
              <p className="text-sm leading-relaxed text-ink-600">
                {paymentMethodLabel(order.payment.method)}
                <br />
                {formatPrice(order.payment.amount)}
                {order.payment.paidAt && (
                  <>
                    {' '}
                    · pago em {formatDate(order.payment.paidAt)}
                  </>
                )}
              </p>
            </div>
          )}
        </section>
      )}

      {order.notes && (
        <section aria-labelledby="observacoes-heading" className="rounded-card border border-cream-200 bg-white p-4">
          <h2 id="observacoes-heading" className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">
            Observações
          </h2>
          <p className="text-sm text-ink-600">{order.notes}</p>
        </section>
      )}

      {!cancelled && !delivered && (
        <section aria-labelledby="acoes-heading" className="flex flex-col gap-3">
          <h2 id="acoes-heading" className="sr-only">
            Ações do pedido
          </h2>
          <Button variant="outline" loading={repeatOrder.isPending} onClick={() => void handleRepeat()}>
            <RotateCcw size={16} aria-hidden />
            Repetir pedido
          </Button>
          {order.cancellable && !showCancelForm && (
            <Button variant="ghost" onClick={() => setShowCancelForm(true)} className="text-red-600 hover:bg-red-50">
              <Ban size={16} aria-hidden />
              Cancelar pedido
            </Button>
          )}
          {showCancelForm && (
            <div className="flex flex-col gap-2.5 rounded-card border border-red-100 bg-red-50/40 p-4">
              <label htmlFor="cancel-reason" className="text-sm font-semibold text-ink-800">
                Conte por que quer cancelar <span className="font-normal text-ink-400">(opcional)</span>
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ex.: comprei o produto errado"
                className="w-full resize-none rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-ink-400 focus:border-accent-300 focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCancelForm(false);
                    setCancelReason('');
                  }}
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-200"
                  loading={cancelOrder.isPending}
                  onClick={() => void handleCancel()}
                >
                  Confirmar cancelamento
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
