import type { Metadata } from 'next';
import { fetchCategoryBySlug } from '@/lib/seo';
import { CategoriaContent } from './categoria-content';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await fetchCategoryBySlug(slug);

  if (!category) {
    return { title: 'Categoria não encontrada', robots: { index: false } };
  }

  const description =
    category.description ?? `Confira os produtos de ${category.name} disponíveis na E-Horta.`;
  const url = `/categorias/${slug}`;

  return {
    title: category.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${category.name} · E-Horta`,
      description,
      url,
      type: 'website',
      images: category.imageUrl ? [{ url: category.imageUrl }] : undefined,
    },
  };
}

export default async function CategoriaPage({ params }: PageProps) {
  const { slug } = await params;
  return <CategoriaContent slug={slug} />;
}
