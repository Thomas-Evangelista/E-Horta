# 12 — Pagamentos

## Abstração PaymentProvider

Não acoplar a aplicação diretamente a um único gateway.

### Interface Conceitual

```
createPayment()
getPayment()
cancelPayment()
refundPayment()
```

### Formas Iniciais

```
PIX
CARD
CASH
```

A implementação do gateway deve ser configurável através de variáveis de ambiente.

## PIX — Fluxo

```
Checkout → Criar cobrança Pix → Retornar QR Code → Usuário paga → Gateway envia webhook → Backend valida webhook → Pagamento aprovado → Atualizar pedido → Confirmar estoque
```

### Regras

- Nunca considerar um pagamento confirmado somente porque o frontend informou sucesso
- O status oficial deve vir do gateway/webhook
- Pagamento confirmado somente através de resposta confiável do gateway/webhook

## Webhooks

### Endpoint

```
POST /api/v1/webhooks/payments
```

### Requisitos

- Validar assinatura
- Validar evento
- Impedir processamento duplicado
- Utilizar idempotência
- Registrar evento
- Atualizar pagamento
- Atualizar pedido
- Atualizar estoque

### Entidade WebhookEvent

```
id
provider
eventId
eventType
payload
processedAt
createdAt
```

`provider + eventId` deve ser único.

### Regras

- Webhook deve ser idempotente

## Idempotência

Operações críticas devem suportar idempotency key:

```
POST /checkout
POST /payments
POST /orders
```

Exemplo de header:

```
Idempotency-Key: UUID
```

Se a mesma requisição for enviada novamente, não criar pedido duplicado.
