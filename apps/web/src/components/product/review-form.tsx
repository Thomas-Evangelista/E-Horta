'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { useCreateReview } from '@/hooks/use-reviews';
import { useSessionStore } from '@/stores/session';

const RATING_LABELS = ['Péssimo', 'Ruim', 'Razoável', 'Bom', 'Ótimo'] as const;

interface ReviewFormProps {
  productId: string;
  productSlug: string;
  productName: string;
}

export function ReviewForm({ productId, productSlug, productName }: ReviewFormProps) {
  const { toast } = useToast();
  const user = useSessionStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLLegendElement>(null);
  const createReview = useCreateReview(productId);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Deep-link a partir do pedido entregue: /produtos/[slug]?avaliar=1#avaliar
  useEffect(() => {
    if (!hydrated) return;
    const search = new URLSearchParams(window.location.search);
    if (search.get('avaliar') === '1' && user) {
      headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [hydrated, user]);

  if (!hydrated) return null;

  if (!user) {
    return (
      <p className="rounded-xl border border-cream-200 bg-cream-50 p-4 text-sm text-ink-600">
        Comprou este produto?{' '}
        <Link
          href={`/login?redirect=${encodeURIComponent(`/produtos/${productSlug}?avaliar=1`)}`}
          className="font-bold text-accent-600 hover:underline"
        >
          Entre na sua conta
        </Link>{' '}
        para avaliá-lo.
      </p>
    );
  }

  if (submitted) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
        className="rounded-xl border border-leaf-200 bg-leaf-50 p-4 text-sm font-medium text-leaf-700"
      >
        ✓ Avaliação enviada! Ela aparecerá aqui após nossa confirmação.
      </motion.p>
    );
  }

  const activeRating = hoveredRating || rating;
  const canSubmit = rating > 0 && !createReview.isPending;

  async function handleSubmit() {
    if (rating === 0) return;
    const trimmedComment = comment.trim();
    try {
      await createReview.mutateAsync({
        rating,
        ...(trimmedComment.length >= 3 ? { comment: trimmedComment } : {}),
      });
      setSubmitted(true);
      toast('success', 'Avaliação enviada. Obrigado!');
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="flex flex-col gap-3 rounded-xl border border-cream-200 bg-white p-4"
      aria-label={`Avaliar ${productName}`}
    >
      <fieldset>
        <legend ref={headingRef} className="mb-2 text-sm font-bold text-ink-900">
          Como você avalia este produto?
        </legend>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} estrela${value > 1 ? 's' : ''} — ${RATING_LABELS[value - 1]}`}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(value)}
              className="rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
            >
              <Star
                size={28}
                aria-hidden
                className={
                  value <= activeRating
                    ? 'fill-accent-400 text-accent-400'
                    : 'fill-transparent text-cream-300'
                }
              />
            </button>
          ))}
          {activeRating > 0 && (
            <span aria-hidden className="ml-1.5 text-xs font-bold text-accent-600">
              {RATING_LABELS[activeRating - 1]}
            </span>
          )}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-comment" className="mb-1 block text-sm font-semibold text-ink-800">
          Conteúdo <span className="font-normal text-ink-400">(opcional)</span>
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Frescor, embalagem, entrega..."
          className="w-full resize-none rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-ink-400 focus:border-accent-300 focus:outline-none"
        />
      </div>

      <Button type="submit" size="sm" className="w-fit self-end" disabled={!canSubmit} loading={createReview.isPending}>
        Enviar avaliação
      </Button>
    </form>
  );
}
