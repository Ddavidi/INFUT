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

## 3. Estado Atual do Projeto (Contexto da IA)
- **MVP Concluído:** As Sprints 1, 2 e 3 foram totalmente implementadas e as Issues #1 a #26 estão fechadas no repositório.
- **Funcionalidades Existentes:** 
  - Autenticação e Perfil de Usuário.
  - Criação, listagem e listagem recorrente de Peladas.
  - RSVP, Status de Pagamento da cota e Valor.
  - Mapa de Localização integrado usando `react-native-maps`.
  - Estatísticas pós-jogo e Votação de MVP (Craque da Pelada).
- **Próximos Passos:** Quaisquer novas funcionalidades deverão gerar novas Issues e ser desenvolvidas usando este contexto base.
