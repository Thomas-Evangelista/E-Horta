'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Minus, Plus, RotateCcw, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import {
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/hooks/use-cart';

function QuantityStepper({
  quantity,
  max,
  disabled,
  onChange,
}: {
  quantity: number;
  max: number;
  disabled?: boolean;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex items-center rounded-pill border border-cream-300">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={disabled || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-l-full text-ink-600 hover:bg-cream-100 disabled:opacity-40"
      >
        <Minus size={15} aria-hidden />
      </button>
      <span aria-live="polite" aria-label={`Quantidade: ${quantity}`} className="w-8 text-center text-sm font-bold">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={disabled || quantity >= max}
        onClick={() => onChange(quantity + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-r-full text-ink-600 hover:bg-cream-100 disabled:opacity-40"
      >
        <Plus size={15} aria-hidden />
      </button>
    </div>
  );
}

export default function CarrinhoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: cart, isLoading, isError, error, refetch } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  async function handleChangeQuantity(itemId: string, quantity: number) {
    setPendingItemId(itemId);
    try {
      await updateItem.mutateAsync({ itemId, quantity });
    } catch (mutationError) {
      toast('error', friendlyMessage(mutationError));
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setPendingItemId(itemId);
    try {
      await removeItem.mutateAsync(itemId);
      toast('success', 'Item removido do carrinho');
    } catch (mutationError) {
      toast('error', friendlyMessage(mutationError));
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleClear() {
    try {
      await clearCart.mutateAsync();
      toast('success', 'Carrinho esvaziado');
    } catch (mutationError) {
      toast('error', friendlyMessage(mutationError));
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-6" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
        <span aria-hidden className="text-5xl">
          🥀
        </span>
        <h1 className="text-xl font-bold text-ink-900">Não foi possível carregar o carrinho</h1>
        <p role="alert" className="max-w-xs text-sm text-ink-500">
          {friendlyMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-1 inline-flex h-11 items-center gap-2 rounded-pill bg-accent-500 px-6 text-sm font-bold text-white hover:bg-accent-600"
        >
          <RotateCcw size={16} aria-hidden />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
        <ShoppingBag size={48} aria-hidden className="text-ink-400" />
        <h1 className="text-xl font-bold text-ink-900">Seu carrinho está vazio</h1>
        <p className="max-w-xs text-sm text-ink-500">
          Que tal dar uma olhada nas ofertas fresquinhas de hoje?
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-11 items-center rounded-pill bg-accent-500 px-6 text-sm font-bold text-white hover:bg-accent-600"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  const hasStockIssues = cart.items.some((item) => !item.hasEnoughStock);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ink-900">
          Carrinho{' '}
          <span className="text-sm font-medium text-ink-400">
            ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'itens'})
          </span>
        </h1>
        <button
          type="button"
          onClick={handleClear}
          disabled={clearCart.isPending}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
        >
          <Trash2 size={15} aria-hidden />
          Esvaziar
        </button>
      </header>

      {hasStockIssues && (
        <p role="alert" className="rounded-xl bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700">
          Alguns itens não têm estoque suficiente. Ajuste as quantidades antes de finalizar.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {cart.items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`overflow-hidden rounded-card border bg-white p-3 shadow-card ${
                item.hasEnoughStock ? 'border-cream-200' : 'border-red-200'
              }`}
            >
              <div className="flex gap-3">
                <Link
                  href={`/produtos/${item.slug}`}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-100"
                  aria-hidden
                  tabIndex={-1}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      width={80}
                      height={80}
                      sizes="80px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">🥕</div>
                  )}
                </Link>

                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/produtos/${item.slug}`}
                        className="text-sm font-semibold leading-snug text-ink-800 hover:text-accent-600"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-ink-400">
                        {formatPrice(item.unitPrice)} / {item.unit.toLowerCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${item.name}`}
                      disabled={pendingItemId === item.id && removeItem.isPending}
                      onClick={() => handleRemove(item.id)}
                      className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>

                  {!item.hasEnoughStock && (
                    <p role="alert" className="text-xs font-semibold text-red-600">
                      Estoque disponível: {item.availableStock}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <QuantityStepper
                      quantity={item.quantity}
                      max={Math.min(999, item.availableStock)}
                      disabled={updateItem.isPending && pendingItemId === item.id}
                      onChange={(quantity) => handleChangeQuantity(item.id, quantity)}
                    />
                    <span className="text-base font-bold text-ink-900">{formatPrice(item.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <section aria-labelledby="resumo-heading" className="rounded-card border border-cream-200 bg-white p-4 shadow-card">
        <h2 id="resumo-heading" className="mb-3 text-base font-bold text-ink-900">
          Resumo
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">Subtotal</dt>
            <dd className="font-medium text-ink-800">{formatPrice(cart.subtotal)}</dd>
          </div>
          {cart.discount > 0 && cart.coupon && (
            <div className="flex justify-between">
              <dt className="text-ink-500">
                Desconto{' '}
                <span className="font-semibold text-leaf-600">
                  ({cart.coupon.code})
                </span>
              </dt>
              <dd className="font-medium text-leaf-600">-{formatPrice(cart.discount)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-cream-200 pt-2.5">
            <dt className="font-bold text-ink-900">Total</dt>
            <dd className="text-lg font-extrabold text-accent-600">
              {formatPrice(cart.subtotal - cart.discount)}
            </dd>
          </div>
        </dl>
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={hasStockIssues}
          onClick={() => router.push('/checkout')}
        >
          Finalizar compra
          <ArrowRight size={18} aria-hidden />
        </Button>
        <p className="mt-2.5 text-center text-xs text-ink-400">
          Cupons e entrega calculados no checkout
        </p>
      </section>
    </div>
  );
}
