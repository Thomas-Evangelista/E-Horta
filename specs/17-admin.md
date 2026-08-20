# 17 — Painel Administrativo

## Aplicação

Criar aplicação administrativa separada (`apps/admin`).

## Dashboard

- Pedidos hoje
- Vendas hoje
- Pedidos pendentes
- Produtos com estoque baixo
- Produtos ativos
- Clientes

## Tela de Produtos

- Listar
- Criar
- Editar
- Ativar/desativar
- Alterar preço
- Alterar estoque
- Upload de imagens

## Tela de Pedidos

- Listar
- Filtrar
- Visualizar
- Atualizar status

## Tela de Categorias

- Criar
- Editar
- Ordenar
- Ativar/desativar

## Tela de Promoções

- Criar
- Editar
- Ativar
- Desativar

## API Admin — Endpoints

```
GET    /api/v1/admin/dashboard

GET    /api/v1/admin/products
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id

GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/:id
PATCH  /api/v1/admin/orders/:id/status

GET    /api/v1/admin/users
GET    /api/v1/admin/inventory

POST   /api/v1/admin/categories
PATCH  /api/v1/admin/categories/:id
DELETE /api/v1/admin/categories/:id
```

### Regras

- Todos devem possuir autorização baseada em role (ADMIN)
- Toda operação administrativa deve ser autorizada no backend
