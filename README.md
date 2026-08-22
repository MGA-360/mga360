# MGA 360 — Plataforma completa

```
mga360-platform/
├── backend/    → API Node.js/TypeScript + Prisma/PostgreSQL
├── frontend/   → Next.js/TypeScript/Tailwind
└── docker-compose.yml
```

## Rodando tudo com Docker (recomendado)

```bash
cd mga360-platform
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- Postgres: localhost:5432 (usuário/senha/db: `mga360`)

Login padrão (criado pelo seed): `admin@mga360.com.br` / `TrocarSenha!123`.

> ⚠️ **Passo manual único antes do primeiro `docker compose up`:** este
> projeto foi montado em um sandbox sem acesso ao binário da Prisma
> (`binaries.prisma.sh` bloqueado), então a migration inicial **ainda não
> existe** em `backend/prisma/migrations/`. Rode uma vez, com Postgres
> disponível (local ou `docker compose up db`):
>
> ```bash
> cd backend
> npm install
> npx prisma migrate dev --name init   # cria prisma/migrations/ + aplica no banco
> ```
>
> Depois disso, `prisma/migrations/` fica versionado no repositório e
> `docker compose up` funciona direto (o container roda `prisma migrate
> deploy`, que só aplica migrations já existentes — não cria novas).

## Rodando sem Docker (desenvolvimento)

Terminal 1 — banco (ou aponte `DATABASE_URL` para um Postgres já existente):
```bash
docker run -d --name mga360-db -e POSTGRES_USER=mga360 -e POSTGRES_PASSWORD=mga360 \
  -e POSTGRES_DB=mga360 -p 5432:5432 postgres:16-alpine
```

Terminal 2 — backend:
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev          # http://localhost:4000
```

Terminal 3 — frontend:
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev           # http://localhost:3000
```

## O que foi validado neste ambiente vs. o que precisa rodar no seu

| Item | Status aqui | Ação necessária |
|---|---|---|
| `tsc --noEmit` (backend e frontend) | ✅ 0 erros | — |
| `next build` | ✅ compila; só falhou baixando fontes do Google (rede bloqueada) | rodar normalmente no seu ambiente |
| `prisma generate` / `migrate` | ❌ bloqueado (`binaries.prisma.sh`) | rodar `npx prisma migrate dev --name init` uma vez (ver acima) |
| `npm install puppeteer` (Chromium) | ❌ não testado aqui | Dockerfile já usa Chromium do sistema via apt, evitando esse download; localmente sem Docker, o `npm install` do Puppeteer baixa o Chromium sozinho (~200MB) |

## Geração de relatórios (PDF)

`POST /reports/generate` agora renderiza um PDF de verdade via Puppeteer
(`backend/src/services/report.service.ts`) — não é mais stub. O arquivo é
salvo em `backend/storage/reports/` (volume `mga360_reports` no Docker) e
servido em `GET /files/reports/:id.pdf`. Trocar por upload a S3/R2/GCS é uma
troca isolada dentro desse arquivo — a interface (`generateReportPdf`) não
muda.

## Sessão e refresh token

O frontend agora renova o access token automaticamente quando uma chamada
recebe 401 (`frontend/src/lib/api.ts`), usando o refresh token guardado no
login. Se o refresh também falhar (expirado/revogado), a sessão é limpa e o
usuário é redirecionado para `/login`.
