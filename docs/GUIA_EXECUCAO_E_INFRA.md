# 📘 INFUT — Guia de Execução, Banco de Dados e Infraestrutura

> **Documento Vivo:** Este guia explica como rodar todo o sistema no seu computador (Backend, App Android e Versão Web), onde o banco de dados está configurado e armazenado, quais contas usar para testar e qual o plano de infraestrutura para publicar na **Google Play Store** e na **Web**.
> *(Atualize a Seção 5 sempre que um serviço for migrado do ambiente local para a nuvem).*

---

## 1. Mapa da Arquitetura e Portas do Sistema

O projeto é dividido em três pastas principais na raiz (`INFUT/`):

```text
INFUT/
├── backend/   # API REST (Node.js + Express 5 + TypeScript + Prisma ORM)
├── mobile/    # Aplicativo Multiplataforma (React Native + Expo SDK + Web)
└── docs/      # Documentação de produto, regras de negócio e infraestrutura
```

### Portas Utilizadas em Desenvolvimento Local

| Serviço | Tecnologia | URL / Porta Local | Observação |
| :--- | :--- | :--- | :--- |
| **API Backend** | Node.js + Express | `http://localhost:3333` | Healthcheck em `/api/health` |
| **App Mobile / Web** | Expo Metro / Web | `http://localhost:8081` | Abre no navegador ou no Expo Go |
| **Prisma Studio** | Painel do Banco | `http://localhost:5555` | Interface visual para ver/editar tabelas |

---

## 2. Onde Fica e Como Gerenciar o Banco de Dados

### 2.1. Ambiente Atual (Desenvolvimento Local)
* **Motor do Banco:** **SQLite** (não precisa instalar Docker nem PostgreSQL para desenvolver localmente).
* **Arquivo Físico dos Dados:** `backend/prisma/dev.db`
* **Arquivo de Conexão:** `backend/.env`
  ```env
  DATABASE_URL="file:./dev.db"
  JWT_SECRET="infut-dev-secret-change-in-production"
  JWT_EXPIRES_IN="7d"
  PORT=3333
  NODE_ENV=development
  ```
* **Definição das Tabelas (Schema):** `backend/prisma/schema.prisma`
* **Histórico SQL (Migrations):** `backend/prisma/migrations/`

### 2.2. Tabelas Existentes no Banco

| Tabela | Descrição | Principais Dados Guardados |
| :--- | :--- | :--- |
| **`users`** | Cadastro e perfil dos atletas | `id`, `name`, `email`, `password_hash`, `sport`, `position`, `region`, `photo_url` |
| **`peladas`** | Eventos esportivos | `title`, `sport`, `date_time`, `duration_hours`, `whatsapp_group_url`, `location`, `price`, `max_players`, `invite_code`, `is_public`, `pix_key`, `goalkeepers_exempt`, `players_per_team`, `cancel_deadline_hours`, `status`, `teams_json`, `matches_json` |
| **`pelada_players`** | Participação, times, financeiro e stats | `role`, `status`, `is_goalkeeper`, `member_type` (`MENSALISTA`/`DIARISTA`), `attendance_status` (`PENDING`/`PRESENT`/`NO_SHOW`), `payment_status`, `goals`, `assists`, `wins`, `voted_mvp_for_id`, `voted_goalkeeper_for_id` |

### 2.3. Como Visualizar e Resetar o Banco

Para abrir uma interface gráfica no navegador e inspecionar todas as tabelas em tempo real:
```bash
cd backend
npm run prisma:studio
```
Isso abrirá `http://localhost:5555` no seu navegador.

Comandos úteis do Prisma (sempre dentro da pasta `backend/`):
- **Aplicar alterações do `schema.prisma` no banco:** `npm run prisma:migrate`
- **Popular dados iniciais de teste (Seed):** `npm run prisma:seed`
- **Recriar o banco do zero e repopular:** `npx prisma migrate reset --force` (e depois `npm run prisma:seed`)

### 2.4. Como Migrar o Banco para a Nuvem (Produção)
Quando formos publicar o sistema para usuários reais na Play Store e na Web:
1. Criar um banco **PostgreSQL** gerenciado em nuvem (ex.: **Supabase**, **Neon** ou **Railway**).
2. Alterar em `backend/prisma/schema.prisma` o bloco `datasource db`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Configurar a variável `DATABASE_URL` no servidor de produção com a string `postgresql://...`.
4. Rodar `npx prisma migrate deploy` no ambiente de produção.

---

## 3. Guia Passo a Passo: Como Rodar Tudo no Computador

### Pré-requisitos
* **Node.js** (v18+ recomendado) e **npm** instalados.
* **Para testar na Web:** Qualquer navegador moderno (Chrome, Edge, Firefox).
* **Para testar no Android:** Emulador Android (Android Studio) **ou** aplicativo **Expo Go** instalado no seu celular Android.

---

### Passo 1: Iniciar o Backend (API)

Abra um terminal na raiz do projeto e execute:

```bash
cd backend
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Se tudo deu certo, o terminal exibirá algo como:
`Server running on port 3333`

Você pode testar se a API está no ar abrindo no navegador:
👉 `http://localhost:3333/api/health`

Principais grupos de rotas disponíveis no Backend:
- **Públicas (Visitante):** `/api/auth/login`, `/api/auth/register`, `/api/peladas/public/:inviteCode`
- **Perfil & Ranking:** `/api/users/me` (`GET`/`PUT`/`DELETE`), `/api/users/ranking`
- **Peladas & Operação:** `/api/peladas`, `/api/peladas/explore`, `/api/peladas/join-code`, `/api/peladas/:id/rsvp`, `/api/peladas/:id/draw-teams`, `/api/peladas/:id/matches`, `/api/peladas/:id/players/:playerId/checkin`, `/api/peladas/:id/players/:playerId/payment`, `/api/peladas/:id/vote-mvp`, `/api/peladas/:id/vote-goalkeeper`

---

### Passo 2: Iniciar o Aplicativo (Web ou Mobile)

Abra um **segundo terminal** (mantenha o terminal do Backend aberto rodando!) e entre na pasta `mobile`:

```bash
cd mobile
npm install
```

Agora escolha **como** deseja rodar o aplicativo:

#### Opção A: Rodar a Versão Web (Mais rápido para testar no PC)
```bash
npm run web
```
O Expo abrirá automaticamente o aplicativo no navegador (em geral em `http://localhost:8081`).
*(O app já detecta que está na Web e conecta automaticamente em `http://localhost:3333/api`).*

#### Opção B: Rodar no Emulador Android (Android Studio)
Com o emulador Android aberto:
```bash
npm run android
```
*(No Emulador Android, o app já aponta automaticamente para `http://10.0.2.2:3333/api`, que é o endereço do seu computador visto de dentro do emulador).*

#### Opção C: Rodar no Seu Celular Físico (via Wi-Fi + Expo Go)
O celular precisa estar **na mesma rede Wi-Fi** que o computador e apontar para o IP local da sua máquina (pois `localhost` no celular aponta para o próprio celular).

1. No Windows (PowerShell ou CMD), descubra o seu IPv4 local:
   ```powershell
   ipconfig
   ```
   *(Procure por `Endereço IPv4`, exemplo: `192.168.0.105`).*

2. No terminal do `mobile`, inicie o Expo passando a variável `EXPO_PUBLIC_API_URL`:
   - **No PowerShell (Windows):**
     ```powershell
     $env:EXPO_PUBLIC_API_URL="http://192.168.0.105:3333/api"
     npx expo start
     ```
   - **No Linux / Mac / Git Bash:**
     ```bash
     EXPO_PUBLIC_API_URL=http://192.168.0.105:3333/api npx expo start
     ```

3. Escaneie o QR Code com o aplicativo **Expo Go** no Android.

> [!WARNING]
> Se o celular não conseguir conectar na API pelo Wi-Fi, verifique se o **Firewall do Windows** não está bloqueando a porta `3333` para conexões da rede privada.

---

## 4. Contas e Dados Prontos para Teste (Seed)

Ao rodar `npm run prisma:seed`, o banco já é populado com **22 usuários** (contas reais de teste) e **3 peladas** prontas para testar todas as permissões, sorteios e fluxos imediatamente:

### Principais Usuários Pré-cadastrados (Senha padrão para todas as 22 contas: `123456`)

| E-mail | Nome | Posição / Região | Papel na "Peladinha da Quinta" (`QUINTA`) |
| :--- | :--- | :--- | :--- |
| `david@test.com` | David Nunes | Meio-campista • Centro - BH | **Organizador Principal** (Pago ✅) |
| `joao@test.com` | Joao Silva | Goleiro • Pampulha - BH | **Co-organizador** e Goleiro (Isento 🛡️) |
| `pedro@test.com` | Pedro Costa | Atacante • Centro - BH | **Jogador** (Pago ✅) |
| `maria@test.com` | Maria Santos | Levantador(a) • Savassi - BH | **Jogadora** na Quinta e Organizadora do *Vôlei de Sábado* |
| `lucas@test.com` ... `henrique@test.com` | 18 atletas adicionais | Goleiros, Zagueiros, Laterais, Volantes, Meias e Atacantes | **16 Confirmados + 2 na Lista de Espera** (totalizando **22 pessoas no grupo**) |

### Códigos de Convite Pré-criados

| Código | Pelada | Esporte | Valor | Status / Recursos |
| :--- | :--- | :--- | :--- | :--- |
| **`QUINTA`** | Peladinha da Quinta | Futebol | R$ 15,00 | Duração 2h, Link do WhatsApp, Chave Pix ativa, **22 participantes no grupo** (20 confirmados + 2 suplentes), 3 times por cores (`Time Amarelo`, `Time Azul`, `Time Vermelho`), gols e voto de Craque |
| **`VOLEI1`** | Vôlei de Sábado | Vôlei | Gratuita | Duração 2h, pública na aba Explorar |
| **`FUTSAL`** | Futsal da Pampulha | Futsal | R$ 20,00 | Duração 1,5h, recorrente semanal, chave Pix ativa |

> 💡 **Dica de Teste Rápido:** Entre com `david@test.com` (`123456`) para testar a visão de **Organizador** (gerenciar mensalistas, aba Financeiro/Caixa, sortear times por cores, dar baixa em pagamentos, promover co-organizador, adicionar convidados). Depois clique em *Perfil > Sair da Conta* e entre com `pedro@test.com` ou `lucas@test.com` para testar a visão de **Jogador** (ver chave Pix e quem já pagou, votar no craque, confirmar/cancelar presença, entrar no grupo do WhatsApp).

---

## 5. Painel de Status de Infraestrutura (Dev vs Produção)

Este quadro acompanha onde cada parte do INFUT está hospedada hoje e o que falta configurar para o lançamento oficial:

| Componente | Ambiente Atual (Dev) | Destino em Produção (Go-Live) | Status |
| :--- | :--- | :--- | :---: |
| **Backend API** | Local (`localhost:3333`) | Railway / Render / Fly.io (HTTPS) | 🟡 Local |
| **Banco de Dados** | SQLite (`backend/prisma/dev.db`) | PostgreSQL em Nuvem (Supabase / Neon) | 🟡 Local |
| **Frontend Web** | Expo Web Local (`localhost:8081`) | Vercel / Netlify (`npx expo export -p web`) | 🟡 Local |
| **App Android** | Expo Go / Emulador Local | Google Play Store via **Expo EAS Build** (`.aab`) | 🟡 Local |

---

## 6. Checklist e Opções para Publicação (Web Pública & Play Store)

### 6.1. Opções para Publicar o App Web com Link Público na Internet

Como o INFUT Web (`mobile/`) consome a API REST (`backend/`), existem **3 caminhos práticos** para colocar o link público no ar:

| Estratégia | Onde roda cada parte | Custo | Quando escolher |
| :--- | :--- | :--- | :--- |
| **Opção 1: Produção Gratuita e Permanente (Recomendada)** | **Web:** Vercel (`npx expo export -p web`)<br>**API:** Render / Railway<br>**Banco:** Neon / Supabase (PostgreSQL) | Gratuito (Free Tiers) | Para uso contínuo com link fixo (`https://infut.vercel.app`) sem precisar deixar seu PC ligado. |
| **Opção 2: Plataforma Única Full-Stack** | **Web + API + PostgreSQL:** tudo no **Railway** ou **Render** | Gratuito / ~US$ 5/mês | Para gerenciar tudo (banco, API e frontend estático) em um único painel. |
| **Opção 3: Link Instantâneo de Teste (Sem Nuvem)** | **Web + API + SQLite:** rodando no seu PC expostos via **Cloudflare Tunnel (`cloudflared`)** ou **Ngrok** | Gratuito | Para testar rápido com amigos hoje mesmo enquanto o seu computador estiver ligado. |

#### Passos da Publicação Web (Opção 1 / Produção)
1. Migrar o `datasource db` do Prisma para **PostgreSQL** (Neon ou Supabase) e publicar o `backend/` com HTTPS (Render ou Railway), rodando `npx prisma migrate deploy` e `npm run prisma:seed`.
2. Gerar o build estático da versão Web apontando para a URL pública da API:
   ```bash
   cd mobile
   EXPO_PUBLIC_API_URL=https://sua-api-em-producao.com/api npx expo export --platform web
   ```
3. Publicar a pasta `mobile/dist/` na **Vercel** ou **Netlify** (com rewrite de SPA para `index.html` e variável `EXPO_PUBLIC_API_URL` configurada no painel).
4. Criar páginas públicas estáticas de `/termos` e `/privacidade` (exigidas pela Google Play).

### 6.2. Publicação na Google Play Store
1. Instalar e logar no EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   cd mobile
   eas build:configure
   ```
2. Configurar em `mobile/app.json`:
   - `android.package` único (ex: `com.infut.app`);
   - Ícone, splash screen e `versionCode`.
3. Gerar o arquivo `.aab` de produção apontando para a API em nuvem (`EXPO_PUBLIC_API_URL`):
   ```bash
   eas build -p android --profile production
   ```
4. Submeter o `.aab` no **Google Play Console**:
   - Conta de desenvolvedor Google Play;
   - Preencher ficha da loja, capturas de tela e questionário de segurança de dados;
   - Informar a URL da Política de Privacidade e que a exclusão de conta in-app já está disponível em *Perfil > Excluir Minha Conta e Dados (LGPD)*.

