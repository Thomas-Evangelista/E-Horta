# 19 — Design System, UI e UX

## Layout Mobile

```
┌─────────────────────────┐
│ Olá, João        🛒     │
│ Entregar em...          │
├─────────────────────────┤
│ 🔎 Buscar produtos      │
├─────────────────────────┤
│ Banner                  │
├─────────────────────────┤
│ Categorias              │
│ 🥬 🥕 🥔 🍅             │
├─────────────────────────┤
│ Ofertas                 │
│ ┌──────┐ ┌──────┐       │
│ │foto  │ │foto  │       │
│ │nome  │ │nome  │       │
│ │preço │ │preço │       │
│ │ +    │ │ +    │       │
│ └──────┘ └──────┘       │
├─────────────────────────┤
│ Mais vendidos           │
├─────────────────────────┤
│                         │
├─────────────────────────┤
│ 🏠  📂  🔎  📦  👤     │
└─────────────────────────┘
```

## Design System — Tokens

Criar tokens:

```
colors
typography
spacing
radius
shadow
z-index
breakpoints
```

Utilizar Tailwind como camada de implementação.

Criar componentes acessíveis e reutilizáveis.

## Acessibilidade

Seguir **WCAG 2.2 AA** como referência.

### Obrigatório

- HTML semântico
- Labels
- aria-label quando necessário
- Foco visível
- Navegação por teclado
- Contraste adequado
- Suporte a leitores de tela
- Mensagens de erro acessíveis
- Estados de loading acessíveis
- Não depender apenas de cor
- Botões com tamanho adequado
- Imagens com alt
- Heading hierarchy

## Animações

Utilizar Framer Motion com moderação.

### Tipos

- **Adicionar produto:** micro scale → contador do carrinho → toast
- **Modal:** Fade + scale
- **Drawer:** Slide
- **Página:** Fade curto
- **Checkout:** Transições suaves

### Regras

- Respeitar `prefers-reduced-motion`
- Usuários com redução de movimento não devem receber animações desnecessárias

## UX de Erros

Criar tratamento global de erros.

### Categorias

```
NETWORK_ERROR
VALIDATION_ERROR
AUTHENTICATION_ERROR
AUTHORIZATION_ERROR
NOT_FOUND
CONFLICT
OUT_OF_STOCK
PAYMENT_ERROR
SHIPPING_ERROR
UNKNOWN_ERROR
```

### Regras

- Nunca exibir stack trace para o usuário
- Exibir mensagem amigável
- Registrar detalhes técnicos somente nos logs
