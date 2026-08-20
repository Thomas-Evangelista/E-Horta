# 13 — Entrega

## Módulo Shipping

A primeira versão poderá trabalhar com regras configuráveis.

### Opções Iniciais

```
Entrega padrão — R$ 9,90 — 1–2 dias
Entrega expressa — R$ 14,90 — Mesmo dia
```

As regras devem ser configuráveis.

## Endpoint

```
POST /api/v1/shipping/quote
```

### Request

```json
{
  "addressId": "uuid",
  "items": []
}
```

### Response

```json
{
  "options": [
    {
      "id": "standard",
      "name": "Entrega padrão",
      "price": 9.9,
      "estimatedDays": 2
    }
  ]
}
```

## Regras

- Nunca deixar o frontend determinar o valor do frete
- O cálculo de entrega deve ser feito pelo backend
