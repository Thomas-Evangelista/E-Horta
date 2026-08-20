# 23 — CI/CD e Documentação

## Pipeline CI/CD

```
install → lint → typecheck → unit tests → integration tests → build → e2e
```

### Regras de Aprovação

Pull Request **não** deve ser aprovado se:

- Lint falhar
- TypeScript falhar
- Testes falharem
- Build falhar

## Documentação

Criar:

```
README.md
docs/architecture.md
docs/api.md
docs/database.md
docs/deployment.md
docs/business-rules.md
```

A API deverá possuir documentação OpenAPI/Swagger.

Disponibilizar `/api/docs` em ambiente de desenvolvimento.
