import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'E-Horta — Hortaliças e produtos frescos',
    short_name: 'E-Horta',
    description:
      'Compre hortaliças, frutas e legumes frescos com entrega rápida. Do campo pra sua casa.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf8ef',
    theme_color: '#4c8c3f',
    lang: 'pt-BR',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
