# 10 — Checkout

## Endpoint

```
POST /api/v1/checkout
```

## Fluxo

O checkout deverá executar, em ordem:

1. Validar usuário
2. Validar endereço
3. Validar produtos
4. Validar estoque
5. Recalcular preços
6. Aplicar promoções
7. Calcular entrega
8. Criar reserva de estoque
9. Criar pedido
10. Iniciar pagamento
11. Retornar dados do pagamento

## Regras

- O frontend **nunca** deve calcular o valor final
- O pedido só pode ser criar após validar: usuário, endereço, estoque, preços, frete e promoções
- O backend é a fonte de verdade para preço, estoque, desconto, frete, pedido e pagamento
