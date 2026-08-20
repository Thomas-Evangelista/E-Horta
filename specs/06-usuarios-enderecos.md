# 06 — Usuários e Endereços

## Entidade User

### Campos

```
id
name
email
phone
passwordHash
role
status
createdAt
updatedAt
```

### Status

```
ACTIVE
INACTIVE
BLOCKED
```

### Regras

- E-mail deve ser único
- Telefone deve ser normalizado
- Senha nunca armazenada em texto puro

## Entidade Address

Um usuário pode possuir múltiplos endereços.

### Campos

```
id
userId
label
zipCode
street
number
complement
neighborhood
city
state
country
isDefault
createdAt
updatedAt
```

### Labels Possíveis

```
Casa
Trabalho
Outro
```

### Regras

- Um usuário pode possuir somente um endereço padrão (`isDefault`)
