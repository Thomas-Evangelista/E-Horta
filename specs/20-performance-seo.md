# 20 — Performance, SEO e PWA

## Performance

### Frontend

- Imagens WebP/AVIF
- Lazy loading
- Responsive images
- Code splitting
- Server Components quando apropriado
- Cache
- Prefetch controlado

### Backend

- Paginação
- Índices
- Cache (Redis)
- Queries eficientes
- Evitar N+1
- Processamento assíncrono

### Objetivo

Experiência rápida em redes móveis.

## SEO

Implementar SEO para páginas públicas.

### Produtos

```
title
description
canonical
Open Graph
structured data
```

- Categorias também devem ser indexáveis
- Utilizar dados estruturados de produto quando aplicável

## Responsividade

### Breakpoints

```
mobile
tablet
desktop
large desktop
```

- Não criar layouts separados desnecessariamente
- Utilizar CSS responsivo

## PWA

Preparar o frontend para PWA futuramente.

### Estrutura Compatível

- Manifest
- Service worker
- Instalação
- Offline básico

A primeira versão não precisa implementar offline completo, mas a arquitetura não deve impedir essa evolução.
