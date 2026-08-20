# 03 — API REST

## Base URL

```
/api/v1
```

## Contrato de Resposta

### Sucesso

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

### Erro

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Existem campos inválidos.",
    "details": []
  }
}
```

## HTTP Status Codes

| Código | Uso |
|--------|-----|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Versionamento

Todas as rotas devem possuir versão:

```
/api/v1/products
/api/v1/orders
/api/v1/cart
```

Nunca quebrar contratos existentes sem criar uma nova versão.

## Paginação

Todas as listagens devem possuir paginação. Preferencialmente cursor pagination para grandes conjuntos.

Para a primeira versão:

```
page
limit
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Limitar `limit` no backend.

## Schemas Consistentes

Listagem:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Erro:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Produto sem estoque disponível.",
    "details": {
      "productId": "uuid"
    }
  }
}
```

## Documentação

A API deverá possuir documentação OpenAPI/Swagger. Disponibilizar `/api/docs` em ambiente de desenvolvimento.
