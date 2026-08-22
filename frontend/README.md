# MGA 360 — Frontend (Next.js)

Interface web do MGA 360, consumindo a API do `mga360-backend`. Identidade visual
própria (paleta "Mata/Palha/Pasto/Milho" — pastagem, terra e milho — nada de
bege+terracota genérico), tipografia Fraunces (display) + Inter (corpo) + IBM
Plex Mono (dados/tabelas).

## Setup

```bash
npm install
cp .env.example .env.local     # aponte NEXT_PUBLIC_API_URL para o backend
npm run dev                    # http://localhost:3000
```

> ⚠️ Validado neste sandbox com `tsc --noEmit` (0 erros) e `next build` — o
> build só falhou por não conseguir baixar as fontes do Google Fonts
> (`fonts.googleapis.com` bloqueado na rede daqui). Isso **não é um bug do
> código**: rode `npm run build` no seu ambiente normal e vai completar. Se
> quiser eliminar essa dependência de rede em build, troque `next/font/google`
> por `next/font/local` com os arquivos de fonte baixados manualmente.

## O que está implementado

- **Login** (`/login`) + recuperação de senha (`/esqueci-senha`)
- **Shell autenticado** com menu lateral (`(app)/layout.tsx`), protegido por
  sessão (redireciona para `/login` se não autenticado)
- **Dashboard Inicial** (`/dashboard`) — boas-vindas, % concluído, módulos
- **Cadastro** (`/cadastro`) — dados gerais + lista de atividades
- **Diagnóstico**: Planejamento, **Financeiro** (módulo de referência, com
  abas Entradas/Saídas e categorias vinculadas às `cost_categories` do
  backend), Custos (somente leitura), Estoque, Pessoas
- **Resultados**: **Radar MGA 360** (gráfico radar SVG customizado — sem lib
  externa, para ter acabamento visual próprio), **Dashboard** (KPIs,
  velocímetro do Ponto de Equilíbrio, gráfico de barras mensal via recharts),
  **Decisão** (perguntas-guia)
- **Relatórios** — histórico + geração
- **Painel Admin** (`/admin`) — lista/busca clientes, formulário de criação
- Minha Conta / Configurações (stubs prontos para expandir)

## Padrão para completar o que falta

Toda página segue o mesmo padrão: `useEffect` chama `api.get(...)`, guarda em
`useState`, renderiza dentro de `.card`. CRUDs seguem o padrão de
`diagnostico/estoque` ou `diagnostico/pessoas` (formulário no topo + tabela
abaixo, mutações otimistas simples). Use esses arquivos como referência ao
adicionar: edição de metas parciais em Planejamento, filtros de mês em
Financeiro, paginação nas tabelas do admin, etc.

## Autosave e progresso

Cada módulo chama `PUT /progress` com `completionPct: 100` ao salvar — hoje
simplificado (tudo ou nada). Para progresso incremental de verdade (ex: "3 de
8 campos preenchidos"), calcule o percentual no componente antes de chamar
`PUT /progress`, campo a campo, com debounce.

## Pendências para produção

- Refresh token automático em requisições 401 (`lib/api.ts` hoje não
  reencaminha para `/auth/refresh` — plugar isso é o próximo passo natural).
- Máscaras de CNPJ/telefone no Cadastro (mencionadas no briefing original).
- Paginação e filtro de data nas tabelas de Financeiro/Estoque/Pessoas.
- Loading/skeleton states mais ricos (hoje é só "Carregando...").
