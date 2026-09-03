import type { Metadata } from 'next';
import { buildProductJsonLd, fetchProductBySlug, fetchReviewSummary } from '@/lib/seo';
import { ProdutoContent } from './produto-content';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    return { title: 'Produto não encontrado', robots: { index: false } };
  }

  const description =
    product.shortDescription ??
    product.description?.slice(0, 155) ??
    `${product.name} fresquinho com entrega rápida na E-Horta.`;
  const url = `/produtos/${slug}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      type: 'website',
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProdutoPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  const reviewSummary = product ? await fetchReviewSummary(product.id) : null;

  return (
    <>
      {product && (
        <script
          type="application/ld+json"
          // Dados estruturados (spec 20): montados a partir da API, sem input do usuário no atributo.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildProductJsonLd(product, reviewSummary)).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <ProdutoContent slug={slug} />
    </>
  );
}
