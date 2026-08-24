'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Banknote,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Home,
  MapPin,
  Plus,
  QrCode,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressForm } from '@/components/address/address-form';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { useSessionStore } from '@/stores/session';
import { useCart } from '@/hooks/use-cart';
import {
  useAddresses,
  useApplyCoupon,
  useCheckout,
  useRemoveCoupon,
  useShippingQuote,
  useSimulatePayment,
} from '@/hooks/use-checkout';
import type { CheckoutResponseDTO, PaymentMethodDTO, ShippingOptionDTO } from '@/types/api';

const PAYMENT_OPTIONS: Array<{ method: PaymentMethodDTO; label: string; hint: string; icon: typeof QrCode }> = [
  { method: 'PIX', label: 'PIX', hint: 'Aprovação na hora', icon: QrCode },
  { method: 'CARD', label: 'Cartão', hint: 'Crédito ou débito', icon: CreditCard },
  { method: 'CASH', label: 'Dinheiro', hint: 'Pague na entrega', icon: Banknote },
];

function SectionCard({
  step,
  title,
  done,
  children,
}: {
  step: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-cream-200 bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center gap-2.5">
        <span
          aria-hidden
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            done ? 'bg-leaf-600 text-white' : 'bg-cream-200 text-ink-600'
          }`}
        >
          {done ? <Check size={13} /> : step}
        </span>
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useSessionStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);
  const { data: cart, isLoading: cartLoading } = useCart();
  const addressesQuery = useAddresses();
  const quoteMutation = useShippingQuote();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const checkoutMutation = useCheckout();
  const simulatePayment = useSimulatePayment();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOptionDTO[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodDTO>('PIX');
  const [notes, setNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [placedOrder, setPlacedOrder] = useState<CheckoutResponseDTO | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login?redirect=%2Fcheckout');
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!cartLoading && cart && cart.items.length === 0 && !placedOrder) {
      router.replace('/carrinho');
    }
  }, [cartLoading, cart, router, placedOrder]);

  // Seleciona endereço padrão automaticamente
  useEffect(() => {
    if (selectedAddressId || !addressesQuery.data?.length) return;
    const preferred = addressesQuery.data.find((a) => a.isDefault) ?? addressesQuery.data[0];
    setSelectedAddressId(preferred.id);
  }, [addressesQuery.data, selectedAddressId]);

  // Calcula frete ao trocar o endereço
  useEffect(() => {
    if (!selectedAddressId || !cart?.items.length) return;
    setShippingOptions([]);
    setSelectedShipping(null);
    quoteMutation
      .mutateAsync({
        addressId: selectedAddressId,
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      })
      .then((options) => {
        setShippingOptions(options);
        const free = options.find((option) => option.fee === 0);
        setSelectedShipping((free ?? options[0])?.method ?? null);
      })
      .catch(() => toast('error', 'Não foi possível calcular a entrega para este endereço.'));
  }, [selectedAddressId, cart?.items.length]);

  const selectedOption = useMemo(
    () => shippingOptions.find((option) => option.method === selectedShipping) ?? null,
    [shippingOptions, selectedShipping],
  );

  const canFinish =
    Boolean(selectedAddressId) &&
    Boolean(selectedShipping) &&
    Boolean(cart && cart.items.length > 0) &&
    !cart?.items.some((item) => !item.hasEnoughStock);

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    try {
      await applyCoupon.mutateAsync(code);
      setCouponInput('');
      toast('success', 'Cupom aplicado!');
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  async function handleRemoveCoupon() {
    try {
      await removeCoupon.mutateAsync();
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  async function handleFinish() {
    if (!selectedAddressId || !selectedShipping) return;
    try {
      const result = await checkoutMutation.mutateAsync({
        addressId: selectedAddressId,
        shippingMethod: selectedShipping as 'STANDARD' | 'EXPRESS',
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      setPlacedOrder(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  async function handleSimulatePayment() {
    if (!placedOrder) return;
    try {
      await simulatePayment.mutateAsync({ paymentId: placedOrder.payment.id, outcome: 'approved' });
      setPaymentApproved(true);
      toast('success', 'Pagamento aprovado!');
    } catch {
      toast('error', 'Não foi possível confirmar o pagamento agora.');
    }
  }

  function handleCopyPix() {
    const code = placedOrder?.payment.charge?.qrCode;
    if (!code) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopiedPix(true);
      window.setTimeout(() => setCopiedPix(false), 1800);
    });
  }

  if (!hydrated || !user || cartLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-6" aria-busy="true">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  // ===== Tela de confirmação do pedido =====
  if (placedOrder) {
    const isPixPending =
      placedOrder.payment.method === 'PIX' &&
      placedOrder.payment.status === 'PENDING' &&
      !paymentApproved;
    const pixCode = placedOrder.payment.charge?.qrCode;

    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          aria-hidden
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white ${
            paymentApproved || placedOrder.payment.status === 'APPROVED' ? 'bg-leaf-600' : 'bg-accent-500'
          }`}
        >
          ✓
        </motion.div>

        <header className="text-center">
          <h1 className="text-xl font-extrabold text-ink-900">Pedido confirmado!</h1>
          <p className="mt-1 text-sm text-ink-500">
            Número <span className="font-bold text-ink-800">{placedOrder.order.orderNumber}</span>
          </p>
        </header>

        <div className="rounded-card border border-cream-200 bg-white p-4 shadow-card">
          <p
            role="status"
            className={`text-center text-sm font-bold ${isPixPending ? 'text-accent-600' : 'text-leaf-700'}`}
          >
            {paymentApproved || placedOrder.payment.status === 'APPROVED'
              ? '✓ Pagamento aprovado'
              : `Pagamento ${placedOrder.payment.method} pendente`}
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Itens</dt>
              <dd className="font-medium">{placedOrder.order.items.length}</dd>
            </div>
            {placedOrder.order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Desconto</dt>
                <dd className="font-medium text-leaf-600">-{formatPrice(placedOrder.order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">Entrega</dt>
              <dd className="font-medium">
                {placedOrder.order.shippingFee === 0 ? 'Grátis' : formatPrice(placedOrder.order.shippingFee)}
              </dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-cream-200 pt-2.5">
              <dt className="font-bold text-ink-900">Total</dt>
              <dd className="text-lg font-extrabold text-accent-600">{formatPrice(placedOrder.order.total)}</dd>
            </div>
          </dl>
        </div>

        {isPixPending && pixCode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-card border border-accent-200 bg-accent-50 p-4"
          >
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-accent-700">
              <QrCode size={16} aria-hidden /> Pague com PIX para concluir
            </p>
            <code className="block max-h-24 overflow-y-auto break-all rounded-xl bg-white p-2.5 font-mono text-[11px] text-ink-600">
              {pixCode}
            </code>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyPix}>
                {copiedPix ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                {copiedPix ? 'Copiado!' : 'Copiar código'}
              </Button>
              <Button size="sm" onClick={handleSimulatePayment} loading={simulatePayment.isPending}>
                Já paguei
              </Button>
            </div>
          </motion.div>
        )}

        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-pill bg-leaf-600 px-6 text-sm font-bold text-white hover:bg-leaf-700"
        >
          Continuar comprando
        </Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) return null;

  // ===== Formulário de checkout =====
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-6">
      <h1 className="text-xl font-extrabold text-ink-900">Finalizar compra</h1>

      {/* 1. Endereço */}
      <SectionCard step={1} title="Endereço de entrega" done={Boolean(selectedAddressId)}>
        {addressesQuery.isLoading && <Skeleton className="h-16 w-full rounded-xl" />}
        {addressesQuery.isError && (
          <p role="alert" className="text-sm text-red-700">
            Não foi possível carregar seus endereços.
          </p>
        )}
        {addressesQuery.data && addressesQuery.data.length === 0 && !showNewAddress && (
          <p className="text-sm text-ink-500">Cadastre um endereço para receber seu pedido.</p>
        )}
        {addressesQuery.data && addressesQuery.data.length > 0 && (
          <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Endereço de entrega">
            {addressesQuery.data.map((address) => (
              <li key={address.id}>
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                    selectedAddressId === address.id
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-cream-200 hover:border-cream-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                    className="mt-0.5 accent-[#e8862e]"
                  />
                  <span className="text-sm">
                    <span className="block font-semibold text-ink-800">
                      {address.street}, {address.number}
                      {address.complement ? ` — ${address.complement}` : ''}
                    </span>
                    <span className="block text-ink-500">
                      {address.neighborhood}, {address.city} — {address.state.toUpperCase()}
                    </span>
                    <span className="block text-xs text-ink-400">CEP {address.zipCode}</span>
                  </span>
                  {address.isDefault && (
                    <span className="ml-auto rounded-pill bg-leaf-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf-700">
                      Padrão
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setShowNewAddress((open) => !open)}
          aria-expanded={showNewAddress}
          className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:underline"
        >
          <Plus size={15} aria-hidden />
          Novo endereço
          <ChevronDown
            size={14}
            aria-hidden
            className={`transition-transform ${showNewAddress ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {showNewAddress && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <AddressForm
                  onCreated={(address) => {
                    setSelectedAddressId(address.id);
                    setShowNewAddress(false);
                    toast('success', 'Endereço salvo!');
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* 2. Entrega */}
      <SectionCard step={2} title="Entrega" done={Boolean(selectedShipping)}>
        {!selectedAddressId && (
          <p className="flex items-center gap-1.5 text-sm text-ink-400">
            <MapPin size={15} aria-hidden /> Escolha o endereço para calcular o frete
          </p>
        )}
        {quoteMutation.isPending && <Skeleton className="h-14 w-full rounded-xl" />}
        {selectedAddressId && shippingOptions.length > 0 && (
          <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Opção de entrega">
            {shippingOptions.map((option) => (
              <li key={option.method}>
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-colors ${
                    selectedShipping === option.method
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-cream-200 hover:border-cream-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={option.method}
                    checked={selectedShipping === option.method}
                    onChange={() => setSelectedShipping(option.method)}
                    className="accent-[#e8862e]"
                  />
                  <Truck size={18} aria-hidden className="shrink-0 text-leaf-600" />
                  <span className="flex-1 text-sm">
                    <span className="block font-semibold text-ink-800">{option.label}</span>
                    <span className="block text-xs text-ink-400">{option.description}</span>
                  </span>
                  <span className="text-sm font-bold text-ink-900">
                    {option.fee === 0 ? 'Grátis' : formatPrice(option.fee)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 3. Pagamento */}
      <SectionCard step={3} title="Pagamento" done={false}>
        <ul className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pagamento">
          {PAYMENT_OPTIONS.map(({ method, label, hint, icon: Icon }) => (
            <li key={method}>
              <label
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                  paymentMethod === method
                    ? 'border-accent-500 bg-accent-50'
                    : 'border-cream-200 hover:border-cream-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                  className="sr-only"
                />
                <Icon size={20} aria-hidden className="text-ink-600" />
                <span className="text-sm font-bold text-ink-800">{label}</span>
                <span className="text-[10px] leading-tight text-ink-400">{hint}</span>
              </label>
            </li>
          ))}
        </ul>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Observações (opcional): ponto de referência, como entregar..."
          aria-label="Observações do pedido"
          className="mt-3 w-full resize-none rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-ink-400 focus:border-accent-400 focus:outline-none"
        />
      </SectionCard>

      {/* Cupom + Resumo */}
      <SectionCard step={4} title="Resumo" done={false}>
        {cart.coupon ? (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-leaf-50 px-3 py-2.5">
            <p className="text-sm">
              <span className="font-bold text-leaf-700">{cart.coupon.code}</span>{' '}
              <span className="text-ink-500">aplicado</span>
            </p>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              disabled={removeCoupon.isPending}
              className="text-sm font-semibold text-red-600 hover:underline"
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="mb-3 flex gap-2">
            <input
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), void handleApplyCoupon())}
              placeholder="Cupom de desconto"
              aria-label="Código do cupom"
              maxLength={64}
              className="h-10 flex-1 rounded-xl border border-cream-300 bg-white px-3.5 text-sm uppercase placeholder:normal-case placeholder:text-ink-400 focus:border-accent-400 focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleApplyCoupon()}
              loading={applyCoupon.isPending}
            >
              Aplicar
            </Button>
          </div>
        )}

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">
              Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'itens'})
            </dt>
            <dd className="font-medium text-ink-800">{formatPrice(cart.subtotal)}</dd>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-500">Desconto</dt>
              <dd className="font-medium text-leaf-600">-{formatPrice(cart.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-500">Entrega</dt>
            <dd className={`font-medium ${!selectedOption ? 'text-ink-400' : ''}`}>
              {!selectedOption
                ? 'a calcular'
                : selectedOption.fee === 0
                  ? 'Grátis'
                  : formatPrice(selectedOption.fee)}
            </dd>
          </div>
        </dl>

        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={!canFinish}
          loading={checkoutMutation.isPending}
          onClick={handleFinish}
        >
          Finalizar compra · {paymentMethod}
        </Button>
        {!canFinish && !checkoutMutation.isPending && (
          <p className="mt-2 text-center text-xs text-ink-400">
            Complete endereço e entrega para finalizar
          </p>
        )}
        <p className="mt-2.5 text-center text-xs text-ink-400">
          O valor final é confirmado no processamento do pedido
        </p>
      </SectionCard>

      <Link
        href="/carrinho"
        className="mx-auto inline-flex items-center gap-1 pb-2 text-sm font-medium text-ink-500 hover:text-accent-600"
      >
        <Home size={14} aria-hidden />
        Voltar ao carrinho
      </Link>
    </div>
  );
}
