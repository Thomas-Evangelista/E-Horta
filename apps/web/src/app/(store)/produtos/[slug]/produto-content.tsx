'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, Minus, Plus } from 'lucide-react';
import { ProductCarousel } from '@/components/product/product-carousel';
import { ReviewForm } from '@/components/product/review-form';
import { ReviewSummary } from '@/components/product/review-summary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { formatDiscount, formatDate, formatPrice } from '@/lib/format';
import { useAddToCart } from '@/hooks/use-cart';
import { useProduct, useRecommendations } from '@/hooks/use-products';
import { useProductReviews } from '@/hooks/use-reviews';

function ReviewsSection({ productId }: { productId: string }) {
  const [limit, setLimit] = useState(5);
  const { data, isLoading, isError, error } = useProductReviews(productId, limit);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {friendlyMessage(error)}
      </p>
    );
  }

  const { reviews, summary, total } = data;

  return (
    <div className="flex flex-col gap-4">
      <ReviewSummary summary={summary} />

      {reviews.length > 0 ? (
        <>
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-xl border border-cream-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink-800">{review.user.name}</span>
                  <time dateTime={review.createdAt} className="text-xs text-ink-400">
                    {formatDate(review.createdAt)}
                  </time>
                </div>
                <p aria-label={`Nota ${review.rating} de 5`} className="mt-1 text-sm text-accent-500">
                  {'★'.repeat(review.rating)}
                  <span className="text-cream-300">{'★'.repeat(5 - review.rating)}</span>
                </p>
                {review.comment && <p className="mt-1.5 text-sm text-ink-600">{review.comment}</p>}
              </li>
            ))}
          </ul>
          {reviews.length < total && (
            <Button
              variant="outline"
              className="self-center px-6"
              loading={isLoading}
              onClick={() => setLimit((l) => Math.min(total, l + 10))}
            >
              Carregar mais avaliações
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-500">
          Ainda não há avaliações publicadas para este produto.
        </p>
      )}
    </div>
  );
}


export function ProdutoContent({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const addToCart = useAddToCart();
  const { data: product, isLoading, isError, error } = useProduct(slug);
  const recommendations = useRecommendations(product?.id, 6);

  async function handleAdd() {
    if (!product) return;
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity });
      setJustAdded(true);
      toast('success', `${quantity}x ${product.name} no carrinho!`);
      window.setTimeout(() => setJustAdded(false), 1500);
    } catch (addError) {
      toast('error', friendlyMessage(addError));
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 py-5" aria-busy="true">
        <Skeleton className="aspect-square w-full max-w-md rounded-card" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p role="alert" className="text-sm text-red-700">
          {friendlyMessage(error)}
        </p>
        <Link href="/" className="text-sm font-semibold text-accent-600 hover:underline">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? formatDiscount(product.price, product.compareAtPrice)
      : 0;

  return (
    <article className="flex flex-col gap-6 py-5">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-500 hover:text-accent-600"
      >
        <ChevronLeft size={16} aria-hidden />
        Voltar
      </Link>

      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <div className="w-full max-w-md shrink-0 overflow-hidden rounded-card bg-cream-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={`Foto do produto ${product.name}`}
              className="aspect-square w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-8xl" aria-hidden>
              🥕
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          {product.category && (
            <p className="text-xs font-semibold uppercase tracking-wider text-leaf-600">
              {product.category.name}
            </p>
          )}
          <h1 className="text-2xl font-extrabold leading-tight text-ink-900">{product.name}</h1>

          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-accent-600">{formatPrice(product.price)}</span>
            <span className="text-sm text-ink-400">/ {product.unitLabel}</span>
            {discount > 0 && <Badge tone="accent">-{discount}%</Badge>}
          </div>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <p className="text-sm text-ink-400 line-through">{formatPrice(product.compareAtPrice)}</p>
          )}

          <p aria-live="polite" className={`text-sm font-semibold ${product.inStock ? 'text-leaf-700' : 'text-red-600'}`}>
            {product.inStock ? '✓ Em estoque' : 'Indisponível no momento'}
          </p>

          {product.shortDescription && (
            <p className="text-sm leading-relaxed text-ink-600">{product.shortDescription}</p>
          )}

          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center rounded-pill border border-cream-300">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-11 w-10 items-center justify-center rounded-l-full text-ink-600 hover:bg-cream-100 disabled:opacity-40"
              >
                <Minus size={16} aria-hidden />
              </button>
              <span aria-live="polite" aria-label={`Quantidade: ${quantity}`} className="w-9 text-center text-sm font-bold">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                className="flex h-11 w-10 items-center justify-center rounded-r-full text-ink-600 hover:bg-cream-100"
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
            <motion.span
              key={`${quantity}-${product.price}`}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              className="text-sm font-medium text-ink-500"
            >
              Total: {formatPrice(product.price * quantity)}
            </motion.span>
          </div>

          <motion.div whileTap={{ scale: 0.98 }} className="mt-auto w-full sm:w-72">
            <Button
              size="lg"
              variant={justAdded ? 'secondary' : 'primary'}
              className="w-full"
              disabled={!product.inStock || addToCart.isPending}
              loading={addToCart.isPending}
              onClick={handleAdd}
            >
              {!addToCart.isPending && (justAdded ? <Check size={18} aria-hidden /> : <Plus size={18} aria-hidden />)}
              {justAdded ? 'Adicionado!' : 'Adicionar ao carrinho'}
            </Button>
          </motion.div>
        </div>
      </div>

      {product.description && (
        <section aria-labelledby="descricao-heading" className="border-t border-cream-200 pt-5">
          <h2 id="descricao-heading" className="mb-2 text-lg font-bold text-ink-900">
            Descrição
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{product.description}</p>
        </section>
      )}

      {product.id && (
        <section id="avaliar" aria-labelledby="avaliacoes-heading" className="border-t border-cream-200 pt-5">
          <h2 id="avaliacoes-heading" className="mb-3 text-lg font-bold text-ink-900">
            Avaliações
          </h2>
          <div className="mb-5">
            <ReviewForm productId={product.id} productSlug={product.slug} productName={product.name} />
          </div>
          <ReviewsSection productId={product.id} />
        </section>
      )}

      {recommendations.data && recommendations.data.length > 0 && (
        <div className="border-t border-cream-200 pt-5">
          <ProductCarousel title="Você também pode gostar" products={recommendations.data} />
        </div>
      )}
    </article>
  );
}
