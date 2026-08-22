# MGA 360 — Backend (API)

Backend Node.js/TypeScript + Express + Prisma/PostgreSQL para a plataforma MGA 360,
construído a partir da análise da planilha original (ver `MGA360-Arquitetura.md`).

## Setup

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e os segredos JWT
npx prisma migrate dev --name init
npx prisma db seed          # cria categorias de custo + usuário admin padrão
npm run dev                 # http://localhost:4000
```

> ⚠️ Este projeto foi montado em um sandbox sem acesso a `binaries.prisma.sh`,
> então `prisma generate`/`migrate` **não foram executados nem validados aqui**.
> Rode os comandos acima no seu ambiente (local ou CI) antes de seguir. Se o
> `npx prisma generate` falhar por rede, ver:
> https://www.prisma.io/docs/orm/reference/error-reference#p1001
>
> Rodei `tsc --noEmit` neste sandbox mesmo sem o client gerado: o único tipo
> de erro que aparece é `Module "@prisma/client" has no exported member...`
> e `implicitly has an 'any' type` em callbacks de `.map()`/`.reduce()` sobre
> resultados do Prisma — ambos desaparecem assim que `prisma generate` roda,
> porque hoje o `@prisma/client` local não tem os tipos do schema. Não são
> bugs de lógica; encontrei e corrigi separadamente os bugs reais que não
> dependiam disso (tipagem de `jwt.sign` em `lib/auth.ts`).

Login padrão criado pelo seed: `admin@mga360.com.br` / `TrocarSenha!123` — troque
imediatamente em produção (ou remova o bloco de seed do admin e crie via SQL).

## Estrutura

```
prisma/schema.prisma      → modelo de dados completo (ver comentários no arquivo)
prisma/seed.ts            → categorias de custo fixas + admin inicial
src/services/calc.service.ts → motor de cálculo (Custos, Dashboard/Ponto de
                                Equilíbrio, Radar MGA 360, Decisão) — o
                                equivalente às fórmulas da planilha
src/routes/*.routes.ts    → um arquivo por recurso da API
src/middleware/auth.middleware.ts → JWT + isolamento por empresa (multi-tenant)
```

## Decisões de design que valem registrar

1. **Nada de fórmula vira coluna.** Percentuais, totais, scores e status são
   sempre calculados em `calc.service.ts` a partir dos dados brutos
   (`finance_entries`, `planning_goals`, `inventory_items`). Isso evita
   dessincronia entre "o que o Excel calcularia" e "o que o banco guarda" —
   o mesmo motivo pelo qual a planilha original protege as células brancas.

2. **Isolamento multi-tenant no middleware, não em cada rota.**
   `requireCompanyContext` resolve automaticamente qual `companyId` usar:
   sempre a própria empresa para `CLIENT`, ou `?companyId=` para `ADMIN`
   atuando em nome de um cliente. Nenhuma rota de recurso decide isso sozinha.

3. **Bug conhecido da planilha original, documentado e corrigido.** A aba
   "Decisão" usa `Dashboard!A5` (Receita Anual) em vez de `C5` (Lucro Anual)
   para responder "estou tendo lucro?" — isso faz a mensagem de prejuízo
   quase nunca aparecer na planilha original. Ver o comentário no topo de
   `calc.service.ts`: por padrão usamos o valor correto (Lucro), com uma
   flag `USE_LITERAL_SPREADSHEET_BUG` para quem quiser fidelidade 100%
   literal à planilha.

4. **Categorias de custo são globais (seed), não por empresa.** Isso replica
   a planilha (7 categorias fixas na aba Custos) e garante que o cálculo de
   Ponto de Equilíbrio (Fixo x Variável) seja consistente. Se no futuro
   clientes precisarem de categorias customizadas, isso vira uma tabela
   `company_id`-scoped com fallback para as globais.

5. **Relatórios usam snapshot congelado.** `POST /reports/generate` grava os
   números calculados no momento em `snapshotJson`, para o PDF não mudar
   retroativamente se dados forem editados depois. A geração real do PDF
   está em `report.service.ts` como stub — trocar por Puppeteer/react-pdf +
   upload para storage (S3/R2/GCS) quando integrar.

## Pendências para produção

- Envio de e-mail real na recuperação de senha (`auth.routes.ts` só loga no console).
- Geração real do PDF (`report.service.ts`).
- Rate limiting e CSRF (se o frontend não for 100% Bearer-token).
- Testes automatizados do `calc.service.ts` — é a parte mais crítica do
  sistema (equivalente às fórmulas) e a mais fácil de testar isoladamente,
  já que é composta só de funções puras sobre dados buscados do Prisma.
