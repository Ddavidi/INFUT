---
description: Instruções e regras gerais para a IA seguir durante o desenvolvimento do INFUT.
---

# Regras de Desenvolvimento (INFUT)

## 1. Banco de Dados (SQL)
- **Utilizar um Banco Relacional (SQL):** Toda a modelagem de dados e as migrações devem ser feitas considerando um banco de dados relacional (ex: SQLite em dev, PostgreSQL em prod) usando o ORM Prisma.

## 2. Git, Commits e Issues
- **Relacionamento com Issues:** Toda melhoria ou correção de bug **deve obrigatoriamente** estar relacionada a uma Issue já existente no GitHub Projects.
- **Padrão de Título do Commit:** O título do commit deve conter o prefixo `feat:` (para melhorias/features) ou `fix:` (para correções) e incluir a referência à issue. Exemplo: `feat(#12): adiciona integração com banco de dados`.
- **Descrição do Commit:** O commit deve sempre conter uma descrição detalhada (no corpo da mensagem) descrevendo o que foi feito de maneira objetiva e **sempre em português do Brasil (pt-BR)**.
- **Push:** Todos os pushes devem seguir estritamente essas regras de versionamento para manter o histórico limpo e rastreável.
