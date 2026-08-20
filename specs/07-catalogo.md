# 07 — Catálogo: Categorias, Produtos e Busca

## Entidade Category

### Campos

```
id
name
slug
description
imageUrl
isActive
sortOrder
createdAt
updatedAt
```

### Categorias Iniciais

```
Verduras
Legumes
Tubérculos
Frutas
```

### Regras

- Permitir subcategorias futuramente
- Categorias devem ser indexáveis para SEO

## Entidade Product

### Campos

```
id
categoryId
name
slug
description
shortDescription
sku
unit
weight
price
compareAtPrice
costPrice
imageUrl
isActive
isFeatured
createdAt
updatedAt
```

### Unidades Possíveis

| Unidade | Exemplo |
|---------|---------|
| UN | Alface — 1 unidade |
| KG | Batata — 1 kg |
| G | Tomate — 500 g |
| PACK | Pacote de alface |
| BUNCH | Maço de rúcula |

## Produtos em Destaque

Suportar:

```
featured
best sellers
promotions
recently purchased
```

### Endpoints

```
GET /api/v1/products/featured
GET /api/v1/products/best-sellers
GET /api/v1/products/promotions
GET /api/v1/products/recommendations
```

## Busca

### Endpoint

```
GET /api/v1/products/search?q=tomate
```

Permitir busca por: nome, SKU, categoria.

Implementar inicialmente busca com PostgreSQL.

Preparar arquitetura para futuramente utilizar: Elasticsearch, Meilisearch ou OpenSearch.

## Filtros

Produtos devem aceitar:

```
category
minPrice
maxPrice
search
featured
available
promotion
sort
page
limit
```

Exemplo:

```
GET /api/v1/products?category=verduras&available=true&sort=price_asc
```
