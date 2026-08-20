# 18 — Frontend

## Framework

Utilizar Next.js App Router.

## Estrutura de Rotas

```
app/
├── page.tsx                    # Home
├── login/                      # Login
├── cadastro/                   # Cadastro
├── categorias/                 # Categorias
├── produtos/
│   └── [slug]/                 # Detalhe do produto
├── busca/                      # Busca
├── carrinho/                   # Carrinho
├── checkout/                   # Checkout
├── pedidos/
│   ├── page.tsx                # Lista de pedidos
│   └── [id]/                   # Detalhe do pedido
├── conta/                      # Minha conta
└── layout.tsx                  # Layout raiz
```

## Componentes

```
components/
├── ui/                         # Componentes base (shadcn/ui)
├── layout/                     # Header, Footer, Sidebar
├── product/                    # ProductCard, ProductGrid
├── cart/                       # CartItem, CartSummary
├── checkout/                   # CheckoutForm, AddressForm
├── order/                      # OrderCard, OrderStatus
├── forms/                      # Formulários reutilizáveis
└── feedback/                   # Toast, Modal, Loading
```

## State Management

### TanStack Query

Para: GET de API, cache, mutations, invalidação, loading, error, refetch.

### Zustand

Para estado local/global de UI: carrinho temporário quando necessário, preferências, filtros, UI state.

### Regras

- Não duplicar indiscriminadamente dados da API no Zustand
- A API deve ser a fonte de verdade

## Formulários

Utilizar **React Hook Form + Zod**.

- Validação no frontend para UX
- Validação obrigatória novamente no backend para segurança
- Nunca confiar somente no frontend
