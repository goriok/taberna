# Taberna — CLAUDE.md

> Leia antes de qualquer ação. Contexto canônico do projeto para sessões Claude Code.

---

## O que é

**Taberna** é uma aplicação de debates filosóficos multiagente. Um usuário propõe um dilema ético e 7 filósofos (simulados via LLM) debatem em rodadas, com intervenção humana entre elas. O resultado é sumarizado ao final.

Aplicação pessoal de Igor — experimental, não é produto comercial.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) — leia `node_modules/next/dist/docs/` antes de escrever código Next |
| Linguagem | TypeScript |
| ORM | Prisma com adapter pg (PostgreSQL) |
| LLM | Vercel AI SDK (`ai`, `@ai-sdk/openai`) |
| Estilo | Tailwind CSS, Framer Motion |
| Validação | Zod |
| DB local | Docker Compose (postgres:15-alpine) |

---

## Estrutura

```
src/
  app/
    api/
      debate/     — POST SSE endpoint (debate orchestration)
      health/     — healthcheck
      summary/    — POST gera resumo da sessão
    filosofos/    — página dos filósofos
    page.tsx      — página principal
    layout.tsx
  lib/
    debate.ts     — orchestrator principal do debate
    llm.ts        — abstração LLM
    session.ts    — cookie-based session (taberna-sid, 1h TTL)
    db.ts         — Prisma client
    export.ts     — exportação de sessões
    proxy.ts
  philosophers/   — um arquivo por filósofo (aristoteles.ts, baudrillard.ts, etc.)
  types/          — schemas Zod e tipos TypeScript
  generated/      — Prisma client gerado (não editar)
prisma/
  schema.prisma   — modelos: DebateSession, PhilosopherRound, Summary
  migrations/
```

---

## Modelos de dados

```prisma
DebateSession     id, createdAt, status (ACTIVE|COMPLETED), dilemma, philosopherCount
PhilosopherRound  sessionId, philosopherName, round, content, createdAt
Summary           sessionId, content, createdAt
```

---

## Fluxo principal

```
POST /api/debate
  → valida com DebateRequestSchema (Zod)
  → getOrCreateSessionId (cookie taberna-sid)
  → debateOrchestrator (src/lib/debate.ts)
  → SSE stream de DebateEvent
  → salva PhilosopherRound no Postgres por rodada
  → intervenção humana via action: "intervene"
```

---

## Filósofos disponíveis

Aristóteles, Baudrillard, Beauvoir, Camus, Angela Davis, Espinosa, Federici, Byung-Chul Han, Heidegger.
Cada filósofo tem seu próprio arquivo com prompt/persona em `src/philosophers/`.

---

## Comandos

```bash
# Dev
npm run dev

# DB local
docker-compose up -d

# Migração
npx prisma migrate dev

# Gerar cliente
npx prisma generate
```

---

## Regras para o Claude

- **Não editar `src/generated/`** — gerado pelo Prisma
- **Não assumir APIs Next.js pelo treino** — ler os docs em `node_modules/next/dist/docs/` antes
- Migrations: sempre criar via `prisma migrate dev`, nunca editar SQL diretamente
- LLM calls: sempre via `src/lib/llm.ts`, nunca instanciar SDK diretamente nas rotas
- SSE: o endpoint `/api/debate` usa `ReadableStream` + `ReadableStreamDefaultController` — não trocar por WebSocket sem discutir
- Testes ficam em `src/__tests__/` e `src/test/`

---

## Ambiente

- Desenvolvimento: `localhost:3000`, Postgres em `localhost:5432`
- Container: `docker-compose.yml` sobe `app` + `db`
- Variáveis obrigatórias: `DATABASE_URL`, `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`
