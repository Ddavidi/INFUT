# INFUT ⚽

**INFUT** — Seu app de gerenciamento de peladas e esportes em grupo.

Chega de confusão no WhatsApp! O INFUT centraliza tudo: criação de eventos, confirmação de presença, controle financeiro, estatísticas e muito mais.

## 🛠️ Tech Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native + Expo (SDK 53) |
| Backend | Node.js + Express + TypeScript |
| Banco de Dados | PostgreSQL + Prisma ORM |
| Autenticação | JWT |

## 📁 Estrutura

`
INFUT/
├── mobile/          # App React Native (Expo)
├── backend/         # API Express
└── docs/            # Documentação
`

## 🚀 Setup Rápido

### Backend
`ash
cd backend
npm install
cp .env.example .env
docker compose up -d       # PostgreSQL
npx prisma migrate dev     # Migrações
npm run dev                # Inicia servidor
`

### Mobile
`ash
cd mobile
npm install
npx expo start             # Inicia Expo
`

## 👥 Equipe

Projeto acadêmico — PUC Minas (Engenharia de Software)

## 📄 Licença

MIT
