# 16 — Notificações

## Módulo Notifications

### Canais Iniciais

- E-mail
- Notificações internas

### Eventos

```
Conta criada
Pedido criado
Pagamento aprovado
Pedido preparado
Pedido saiu para entrega
Pedido entregue
Pagamento falhou
```

### Regras

- Utilizar fila assíncrona (BullMQ + Redis)
- Processamento via workers
