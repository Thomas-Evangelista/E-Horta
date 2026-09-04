'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { formatDiscount, formatPrice } from '@/lib/format';
import { imagePlaceholder } from '@/lib/image';
import { useAddToCart } from '@/hooks/use-cart';
import type { Product } from '@/types/api';

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : product.imageUrl;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-t-card bg-cream-100">
      {src === null ? (
        <div className="flex h-full w-full items-center justify-center text-5xl" aria-hidden>
          🥕
        </div>
      ) : (
        <Image
          src={src}
          alt={`Foto do produto ${product.name}`}
          width={600}
          height={600}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          placeholder="blur"
          blurDataURL={imagePlaceholder(product.name)}
          className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
          onError={() => setFailed(true)}
        />
      )}
      {!product.inStock && (
        <span className="absolute inset-x-0 bottom-0 bg-ink-800/80 py-1 text-center text-xs font-semibold text-white">
          Indisponível
        </span>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { toast } = useToast();
  const addToCart = useAddToCart();
  const [justAdded, setJustAdded] = useState(false);
  const discount = product.compareAtPrice ? formatDiscount(product.price, product.compareAtPrice) : 0;

  async function handleAdd() {
    try {
      await addToCart.mutateAsync({ productId: product.id });
      setJustAdded(true);
      toast('success', `${product.name} adicionado ao carrinho`);
      window.setTimeout(() => setJustAdded(false), 1500);
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-cream-200 bg-white shadow-card transition-shadow hover:shadow-md">
      <Link href={`/produtos/${product.slug}`} aria-label={product.name}>
        <ProductImage product={product} />
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {discount > 0 && (
            <Badge tone="accent" className="self-start">
              -{discount}%
            </Badge>
          )}
          {product.rating && product.rating.count > 0 && (
            <span className="inline-flex items-center gap-0.5 self-start rounded-full bg-cream-100 px-1.5 py-0.5 text-xs font-semibold text-ink-700">
              <Star size={11} aria-hidden className="fill-amber-400 text-amber-400" />
              {product.rating.average.toFixed(1)}
              <span className="text-ink-400">({product.rating.count})</span>
            </span>
          )}
        </div>
        <Link href={`/produtos/${product.slug}`} className="text-sm font-medium leading-snug text-ink-800 hover:text-accent-600">
          {product.name}
        </Link>
        <p className="text-xs text-ink-400">{product.unitLabel}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <p className="text-xs text-ink-400 line-through">{formatPrice(product.compareAtPrice)}</p>
            )}
            <p className="text-base font-bold text-ink-900">{formatPrice(product.price)}</p>
          </div>
          <motion.button
            type="button"
            aria-label={`Adicionar ${product.name} ao carrinho`}
            aria-busy={addToCart.isPending}
            disabled={!product.inStock || addToCart.isPending}
            onClick={handleAdd}
            whileTap={justAdded ? undefined : { scale: 0.82 }}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-white transition-colors disabled:cursor-not-allowed disabled:bg-cream-300 ${
              justAdded ? 'bg-leaf-600' : 'bg-accent-500 hover:bg-accent-600'
            }`}
          >
            {justAdded ? <Check size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
          </motion.button>
        </div>
      </div>
    </article>
  );
}
