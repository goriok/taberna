# Taberna — Encontro de Filósofos

## TL;DR

> **Quick Summary**: Web app onde 7 filósofos-IA debatem dilemas do dia-a-dia do usuário em 3 rodadas de debate paralelo. Estética boêmia parisiense. Deploy no k3s como `taberna.goriok.com`. Stack: Next.js 15 + Vercel AI SDK v6 + Prisma + PostgreSQL.
>
> **Deliverables**:
> - App Next.js com UI taverna (página única de debate + cards de filósofo + resumo narrativo)
> - 7 personas filosóficas (system prompts baseados no documento de referência)
> - API routes para orquestração de debate (3 rodadas com streaming paralelo)
> - Persistência de resumo narrativo (Prisma + PostgreSQL)
> - Container Docker + manifests k8s (namespace, deployment, service, ingress, kustomization)
> - Testes unitários + integração (Vitest + React Testing Library)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves, até 7 tasks paralelas
> **Critical Path**: Task 1 → Task 4 → Task 8 → Task 10 → Task 12 → Task 16 → F1-F4

---

## Context

### Original Request
Construir "Taberna" — inspirado no projeto `cantinho` mas com temática totalmente diferente: um encontro de múltiplos filósofos que discutem fatos que o usuário traz do dia-a-dia. Temática boêmia e visual clean. Deploy em `/Users/goriok/sources/my-cluster` como `taberna.goriok.com` (host e autenticação já prontos).

### Interview Summary

**Key Discussions**:
- **Modelo de conversa**: Debate simultâneo — 3 rodadas (todos respondem → réplicas → intervenção do usuário → tréplicas finais)
- **Filósofos**: 7 fixos baseados no documento de referência (Heidegger, Nietzsche, Schopenhauer, Camus, Byung-Chul Han, Kosík, Sennett), expansível futuramente
- **Persistência**: Apenas o resumo narrativo ao fim da sessão (estilo "ata da noite" da taverna). Conversas completas NÃO persistem — efêmeras como uma noite de taverna
- **Stack**: JavaScript/TypeScript — Next.js 15 + Vercel AI SDK v6 + React 19 + Tailwind CSS + Prisma + PostgreSQL
- **Visual**: Boêmia parisiense — verde-garrafa, creme, cobre, âmbar, art nouveau
- **Auth**: Cloudflare Access apenas (sem contas no app). Sessão anônima.
- **Testes**: TDD com Vitest + React Testing Library + agent-executed QA scenarios

**Research Findings**:
- **cantinho**: Python/FastAPI/LangChain — stack diferente, mas padrão de deploy (Docker + k8s + Kustomize) é replicável
- **my-cluster**: k3s com Traefik + Cloudflare Tunnel + Cloudflare Access. Padrão documentado para adicionar novos serviços: 5 arquivos YAML + DNS CNAME
- **Vercel AI SDK v6**: Suporte nativo a subagents, streaming paralelo, React hooks. Em beta (6.0.0-beta.128) — versão deve ser pinada. Melhor que LangChain para multi-agente
- **SPASM paper**: Egocentric Context Projection previne persona drift. Structured persona template garante consistência de voz
- **OSS referência**: moltbot-philosopher (10 filósofos, conselho), chatsparty (AI selector), excing/WebMultiAgentChat (3 modos de turno)

### Metis Review

**Identified Gaps** (addressed):
- **Documento filosófico existe?**: Sim — o texto fornecido pelo usuário na mensagem inicial é o documento de referência. Contém: praxis pessoal concreta (Heidegger, Nietzsche, Schopenhauer, Camus, Han, Kosík), neurodivergência como praxis ontológica, logos como resignificação, o artífice (Sennett), analogia do rio
- **Vercel AI SDK beta**: Versão pinada (`6.0.0-beta.128`). Smoke test de streaming antes de cada deploy
- **Sessão anônima**: Cookies de sessão no servidor (não sessionStorage, que não funciona com SSR). UUID gerado no primeiro request, armazenado em cookie httpOnly
- **Orquestração server-side**: API routes do Next.js gerenciam o debate. Cliente é thin UI layer que consome streams via SSE
- **Custo por debate**: ~$0.30–$1.50 por sessão (21+ chamadas Claude). Sem rate-limiting no app (Cloudflare Access + rate-limit no edge se necessário)
- **Falha de LLM**: Se 1 filósofo falhar, os outros 6 continuam. Card de erro mostra "X está meditando em silêncio..."
- **Prisma migration**: Kubernetes Job roda `prisma migrate deploy` antes do Deployment iniciar
- **Resumo narrativo**: Gerado ao fim da rodada 3 via chamada LLM separada. Formato markdown. Exibido inline abaixo do debate
- **Filosofia hardcoded**: 7 personas como objetos TypeScript em `src/philosophers/`. Sem DB para config de persona. Sem UI de settings

---

## Work Objectives

### Core Objective
Construir uma aplicação web onde 7 filósofos-IA debatem, em 3 rodadas, dilemas do cotidiano submetidos pelo usuário, com visual de taverna boêmia parisiense e deploy em produção no cluster k3s.

### Concrete Deliverables
- `src/app/page.tsx` — Página única do debate (input + cards + resumo)
- `src/app/api/debate/route.ts` — API route de orquestração do debate (3 rodadas, streaming SSE)
- `src/app/api/summary/route.ts` — API route de geração de resumo narrativo
- `src/app/api/health/route.ts` — Health check para k8s probes
- `src/philosophers/*.ts` — 7 personas filosóficas (system prompts + config)
- `src/lib/debate/` — Orquestração do debate (round manager, context projection, turn selector)
- `src/lib/db/` — Prisma schema + client
- `prisma/schema.prisma` — Modelos: DebateSession, Summary, Philosopher
- `Dockerfile` — Build multi-stage (Next.js standalone)
- `k8s/*.yaml` — Manifests: namespace, configmap, deployment, service, ingress, kustomization

### Definition of Done
- [ ] `bun run build` compila sem erros
- [ ] `bun test` passa todos os testes (Vitest)
- [ ] `docker build -t taberna .` produz imagem funcional
- [ ] `kubectl apply -k k8s/` implanta no cluster com pod Ready
- [ ] `curl -I https://taberna.goriok.com` retorna 200
- [ ] Debate de 3 rodadas com 7 filósofos funciona (Playwright)
- [ ] Resumo narrativo é gerado e persiste no PostgreSQL
- [ ] Mobile (375px) renderiza corretamente (Playwright)
- [ ] WCAG AA contraste verificado (axe-core)

### Must Have
- [ ] 7 filósofos respondem em paralelo na rodada 1
- [ ] Streaming token-a-token visível para cada filósofo
- [ ] Rodada 2 (réplicas) com contexto das respostas anteriores
- [ ] Intervenção do usuário entre rodadas 2 e 3
- [ ] Resumo narrativo literário ao fim da sessão
- [ ] Visual boêmia parisiense aplicado consistentemente
- [ ] Deploy funcional em taberna.goriok.com
- [ ] Sessão anônima (cookie httpOnly)

### Must NOT Have (Guardrails)
- [ ] Qualquer UI de configuração/admin/settings para personas
- [ ] Histórico de conversas (apenas o resumo da sessão atual persiste)
- [ ] Navegação entre páginas (app de página única)
- [ ] Contas de usuário, login, ou perfil
- [ ] Dependência LangChain ou Python
- [ ] Abstração genérica de filósofo (7 objetos explícitos, sem factory/base class)
- [ ] i18n / multi-idioma (pt-BR apenas)
- [ ] Analytics, métricas, ou dashboards
- [ ] Tema customizável ou dark/light mode switch
- [ ] RAG, busca em corpus, ou knowledge base externa
- [ ] Áudio, TTS, ou voice input
- [ ] Compartilhamento social

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **Automated tests**: TDD (RED → GREEN → REFACTOR)
- **Framework**: Vitest + React Testing Library + Playwright (para QA scenarios)
- **Setup included**: Task 1 configura Vitest no projeto

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot, axe-core a11y
- **API/Backend**: Bash (curl) — Send requests, assert status + response fields + headers
- **Streaming**: curl —N para SSE, assert tokens chegam, ordem correta
- **DB**: Bash (psql) — Query diretamente, assert schema + dados

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + types + config):
├── Task 1: Project scaffolding + tooling [quick]
├── Task 2: Design system tokens + Tailwind config [visual-engineering]
├── Task 3: Prisma schema + database setup [unspecified-low]
├── Task 4: Type definitions + shared contracts [quick]
└── Task 5: Philosopher persona prompts (7 files) [writing]

Wave 2 (After Wave 1 — core infrastructure, MAX PARALLEL):
├── Task 6: Health endpoint + k8s probes config [quick]
├── Task 7: Anonymous session middleware [quick]
├── Task 8: Debate orchestrator (round manager) [deep]
├── Task 9: Context projection engine [unspecified-high]
├── Task 10: LLM provider setup + streaming [unspecified-high]
└── Task 11: Philosopher card component [visual-engineering]

Wave 3 (After Wave 2 — integration + API routes):
├── Task 12: POST /api/debate route (full 3-round flow) [deep]
├── Task 13: POST /api/summary route (narrative generation) [unspecified-high]
├── Task 14: Main page component (input + debate grid + summary) [visual-engineering]
├── Task 15: Mobile responsive layout [visual-engineering]
└── Task 16: Error handling + edge cases [unspecified-high]

Wave 4 (After Wave 3 — deployment):
├── Task 17: Dockerfile (multi-stage, Next.js standalone) [quick]
├── Task 18: k8s manifests (namespace, configmap, deployment, service, ingress, kustomization) [quick]
├── Task 19: Prisma migration Job [unspecified-low]
└── Task 20: Integration & E2E tests [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high + playwright)
└── Task F4: Scope Fidelity Check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4 → Task 8 → Task 10 → Task 12 → Task 16 → F1-F4 → user okay
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Waves 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 2-20 | 1 |
| 2 | 1 | 11, 14, 15 | 1 |
| 3 | 1 | 6, 7, 13, 19 | 1 |
| 4 | 1 | 5, 8, 9, 10, 11, 12, 13 | 1 |
| 5 | 4 | 8, 10, 12 | 1 |
| 6 | 1, 3, 4 | 18 | 2 |
| 7 | 1, 3, 4 | 12 | 2 |
| 8 | 4, 5 | 12 | 2 |
| 9 | 4, 5 | 12 | 2 |
| 10 | 4, 5 | 12 | 2 |
| 11 | 2, 4 | 14, 15 | 2 |
| 12 | 7, 8, 9, 10 | 14, 16, 20 | 3 |
| 13 | 3, 4, 10 | 14, 20 | 3 |
| 14 | 2, 11, 12, 13 | 15, 20 | 3 |
| 15 | 2, 11, 14 | 20 | 3 |
| 16 | 12 | 20 | 3 |
| 17 | 14 | 18 | 4 |
| 18 | 6, 17 | 19, 20 | 4 |
| 19 | 3, 18 | - | 4 |
| 20 | 12, 13, 14, 15, 16, 18 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — T1 → `quick`, T2 → `visual-engineering`, T3 → `unspecified-low`, T4 → `quick`, T5 → `writing`
- **Wave 2**: 6 tasks — T6 → `quick`, T7 → `quick`, T8 → `deep`, T9 → `unspecified-high`, T10 → `unspecified-high`, T11 → `visual-engineering`
- **Wave 3**: 5 tasks — T12 → `deep`, T13 → `unspecified-high`, T14 → `visual-engineering`, T15 → `visual-engineering`, T16 → `unspecified-high`
- **Wave 4**: 4 tasks — T17 → `quick`, T18 → `quick`, T19 → `unspecified-low`, T20 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Project Scaffolding + Tooling

  **What to do**:
  - `bun create next-app taberna --typescript --tailwind --eslint --app --src-dir`
  - Install dependencies: `ai@6.0.0-beta.128`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@prisma/client`, `prisma`, `framer-motion`, `zod`, `uuid`
  - Install dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `jsdom`, `@playwright/test`
  - Configure `vitest.config.ts` (jsdom environment, setup file, path aliases)
  - Configure `playwright.config.ts` (chromium, webServer, baseURL)
  - Configure `package.json` scripts: `test`, `test:watch`, `test:e2e`, `db:migrate`, `db:push`, `db:studio`
  - Create `.env.example` with: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`
  - Create directory structure: `src/lib/debate/`, `src/lib/llm/`, `src/philosophers/`, `src/components/`, `src/types/`
  - Write a trivial test (`1 + 1 = 2`) to verify Vitest works
  - Verify: `bun run build` compiles, `bun test` passes

  **Must NOT do**:
  - Do NOT create any pages or API routes yet
  - Do NOT add any AI logic or philosopher content
  - Do NOT configure Prisma schema beyond the default

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard scaffolding task, following Next.js conventions exactly. No creative decisions.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `conventional-commits`: Not needed for initial project init

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete first — all other tasks depend on project existing)
  - **Parallel Group**: Wave 1 (foundation)
  - **Blocks**: All tasks (2-20)
  - **Blocked By**: None

  **References**:
  - `package.json` (created by create-next-app) — Canonical Next.js 15 project structure
  - `ai@6.0.0-beta.128` at `https://sdk.vercel.ai/docs` — Vercel AI SDK v6 API reference
  - Official docs: `https://nextjs.org/docs/app/api-reference/create-next-app` — Next.js project scaffolding

  **Acceptance Criteria**:
  - [ ] `bun run build` exits with code 0
  - [ ] `bun test` runs and passes at least 1 test
  - [ ] `ls src/lib/debate/ src/lib/llm/ src/philosophers/ src/components/ src/types/` shows all directories exist
  - [ ] `.env.example` contains ANTHROPIC_API_KEY, DATABASE_URL, OPENAI_API_KEY

  **QA Scenarios**:

  ```
  Scenario: Happy path — project compiles and tests run
    Tool: Bash
    Preconditions: Fresh project directory at /Users/goriok/sources/taberna
    Steps:
      1. cd /Users/goriok/sources/taberna && bun run build
      2. Assert exit code 0 (no TypeScript errors)
      3. bun test --run
      4. Assert output contains "1 passed" (or more)
    Expected Result: Build succeeds, tests pass
    Failure Indicators: Build errors, test failures, missing dependencies
    Evidence: .sisyphus/evidence/task-1-build-test.txt

  Scenario: Failure — missing directory structure
    Tool: Bash
    Preconditions: Project initialized via create-next-app
    Steps:
      1. ls src/lib/debate/ && ls src/lib/llm/ && ls src/philosophers/ && ls src/components/ && ls src/types/
      2. Assert all paths exist (no "No such file or directory" errors)
      3. ls .env.example
      4. Assert file exists
    Expected Result: All required directories and .env.example exist
    Failure Indicators: Missing directory, missing .env.example
    Evidence: .sisyphus/evidence/task-1-structure.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-1-build-test.txt`: Build + test output
  - [ ] `task-1-structure.txt`: Directory listing

  **Commit**: YES (groups with N/A — solo commit)
  - Message: `chore: init Next.js project with Vitest, Tailwind, Prisma`
  - Files: All scaffolded files

- [x] 2. Design System Tokens + Tailwind Config

  **What to do**:
  - Define CSS custom properties (design tokens) for bohemian Parisian palette:
    - `--color-bg`: `#f5f0e8` (cream paper)
    - `--color-bg-dark`: `#1a1814` (dark tavern corner)
    - `--color-text`: `#2c2416` (dark ink)
    - `--color-text-light`: `#f5f0e8` (cream on dark)
    - `--color-primary`: `#1a3c2a` (bottle-green)
    - `--color-primary-light`: `#2d5a3f` (lighter green)
    - `--color-accent`: `#b87333` (copper)
    - `--color-accent-light`: `#d4944a` (warm copper)
    - `--color-amber`: `#c77d20` (absinthe amber)
    - `--color-card`: `#faf7f2` (aged paper)
    - `--color-card-border`: `#d4c5b2` (parchment edge)
    - `--font-serif`: `'Playfair Display', serif`
    - `--font-sans`: `'Inter', sans-serif`
  - Extend Tailwind config with these tokens as theme extensions
  - Write `globals.css` with `@tailwind base/components/utilities`, font imports (Google Fonts), base styles
  - Add art nouveau decorative elements: thin gold borders, ornamental dividers (CSS-only, no images)
  - Define typography scale: headings (Playfair Display), body (Inter), philosopher quotes (italic Playfair)
  - Create `src/components/TavernBackground.tsx` — subtle parchment texture background (CSS gradients)
  - Write Vitest test verifying Tailwind classes render correctly (check computed styles in jsdom)
  - Create `src/components/DecorativeDivider.tsx` — art nouveau ornamental line (CSS)

  **Must NOT do**:
  - Do NOT create any philosopher-related components yet
  - Do NOT add dark/light mode toggle
  - Do NOT add animations (Framer Motion setup in a later task)
  - Do NOT use images — CSS-only decorations

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Pure visual design system work — color tokens, typography, decorative CSS elements. Requires design sensibility matching the bohemian Parisian aesthetic.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Designer-turned-developer who crafts stunning UI/UX even without design mockups — directly applicable to creating the tavern aesthetic from a text description.
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed — this is pure CSS/design tokens

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 4, 5)
  - **Blocks**: Tasks 11, 14, 15
  - **Blocked By**: Task 1

  **References**:
  - `tailwind.config.ts` (created by Task 1) — Tailwind v4 configuration format
  - `src/app/globals.css` (created by Task 1) — Where to add custom properties and base styles
  - ADR-0004 from cantinho (`/Users/goriok/sources/cantinho/docs/adrs/0004-tema-aconchegante.md`) — Reference for how cantinho structured its theme tokens (same pattern, different palette)

  **Acceptance Criteria**:
  - [ ] `bun test` passes with design token test (verifying CSS custom properties exist)
  - [ ] Opening `src/app/globals.css` shows `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500&display=swap')`
  - [ ] `TavernBackground` component renders without errors
  - [ ] `DecorativeDivider` component renders without errors

  **QA Scenarios**:

  ```
  Scenario: Happy path — design tokens render correctly
    Tool: Playwright
    Preconditions: App running (bun dev) on localhost:3000
    Steps:
      1. Navigate to http://localhost:3000
      2. Open browser DevTools → Computed Styles
      3. Assert `--color-bg` equals `#f5f0e8` on `:root`
      4. Assert `--color-primary` equals `#1a3c2a` on `:root`
      5. Assert `--font-serif` contains `Playfair Display`
      6. Assert `--font-sans` contains `Inter`
    Expected Result: All custom properties defined on :root with correct values
    Failure Indicators: Missing or incorrect CSS variable values
    Evidence: .sisyphus/evidence/task-2-design-tokens.png

  Scenario: Edge case — font loading
    Tool: Playwright
    Preconditions: App running, network throttled to 3G
    Steps:
      1. Navigate to http://localhost:3000
      2. Wait for fonts to load (document.fonts.ready)
      3. Assert at least one element uses 'Playfair Display' (computed font-family)
    Expected Result: Google Fonts load and apply correctly
    Failure Indicators: Fallback font used, font load timeout
    Evidence: .sisyphus/evidence/task-2-fonts.png
  ```

  **Evidence to Capture**:
  - [ ] `task-2-design-tokens.png`: Screenshot showing computed CSS variables
  - [ ] `task-2-fonts.png`: Screenshot showing font rendering

  **Commit**: YES (groups with 2)
  - Message: `feat: add design system tokens and Tailwind config`
  - Files: `tailwind.config.ts`, `src/app/globals.css`, `src/components/TavernBackground.tsx`, `src/components/DecorativeDivider.tsx`

- [x] 3. Prisma Schema + Database Setup

  **What to do**:
  - Write `prisma/schema.prisma` with PostgreSQL provider
  - Models:
    - `DebateSession`: id (uuid), createdAt, status (ACTIVE/COMPLETED), dilemma (text), philosopherCount (int)
    - `Summary`: id (uuid), sessionId (FK → DebateSession), content (text, markdown), createdAt
    - `PhilosopherRound`: id (uuid), sessionId (FK → DebateSession), philosopherName (string), round (int 1-3), content (text), createdAt
  - Configure `DATABASE_URL` in `.env`
  - Run `prisma migrate dev --name init` to generate migration
  - Create `src/lib/db/prisma.ts` — singleton Prisma client with connection management
  - Create `src/lib/db/index.ts` — barrel export
  - Write unit tests for Prisma models using in-memory or test database:
    - Test DebateSession CRUD
    - Test Summary creation with session relation
    - Test PhilosopherRound creation
  - Verify `prisma migrate deploy` works (dry-run)

  **Must NOT do**:
  - Do NOT create API routes that use these models yet
  - Do NOT create seed data for philosophers (personas are hardcoded in source, not DB)
  - Do NOT add any UI components

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward schema definition with standard Prisma patterns. No complex business logic.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `conventional-commits`: Not needed for schema work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4, 5)
  - **Blocks**: Tasks 6, 7, 13, 19
  - **Blocked By**: Task 1

  **References**:
  - Official docs: `https://www.prisma.io/docs/orm/prisma-schema` — Prisma schema reference
  - Official docs: `https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration` — Prisma client setup
  - `prisma/schema.prisma` (created by Task 1 init) — Default schema to modify

  **Acceptance Criteria**:
  - [ ] `prisma migrate dev --name init` succeeds and creates migration files
  - [ ] `bun test` passes with model CRUD tests
  - [ ] `prisma db push` succeeds (schema in sync)
  - [ ] `prisma studio` opens and shows all 3 models

  **QA Scenarios**:

  ```
  Scenario: Happy path — create and query models
    Tool: Bash
    Preconditions: PostgreSQL running, DATABASE_URL set, migrations applied
    Steps:
      1. bun run prisma db push --skip-generate
      2. Assert exit code 0 (schema in sync)
      3. bun test --run tests/prisma.test.ts
      4. Assert all tests pass (DebateSession CRUD, Summary creation, PhilosopherRound creation)
    Expected Result: Schema applied, all model tests pass
    Failure Indicators: Migration failure, test assertion failure
    Evidence: .sisyphus/evidence/task-3-prisma-test.txt

  Scenario: Failure — invalid DATABASE_URL
    Tool: Bash
    Preconditions: DATABASE_URL set to invalid value
    Steps:
      1. DATABASE_URL=invalid://url prisma db push 2>&1
      2. Assert output contains connection error (not a silent hang)
      3. Assert exit code is non-zero
    Expected Result: Connection error with clear message
    Failure Indicators: Silent hang, cryptic error
    Evidence: .sisyphus/evidence/task-3-db-error.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-3-prisma-test.txt`: Test output
  - [ ] `task-3-db-error.txt`: Error handling test

  **Commit**: YES (groups with 3)
  - Message: `feat: add Prisma schema for debates and summaries`
  - Files: `prisma/schema.prisma`, `prisma/migrations/*`, `src/lib/db/prisma.ts`, `src/lib/db/index.ts`, `tests/prisma.test.ts`

- [x] 4. Type Definitions + Shared Contracts

  **What to do**:
  - Create `src/types/debate.ts`:
    - `DebatePhase`: `'idle' | 'round1' | 'round2' | 'user-intervention' | 'round3' | 'summary' | 'complete'`
    - `PhilosopherResponse`: `{ philosopherName, round, content, status: 'streaming' | 'complete' | 'error' }`
    - `DebateState`: `{ phase, responses: PhilosopherResponse[], summary: string | null, dilemma: string, sessionId: string }`
    - `DebateRequest`: `{ dilemma: string, sessionId?: string }` (zod schema)
    - `DebateEvent`: SSE event type (discriminated union)
  - Create `src/types/philosopher.ts`:
    - `PhilosopherConfig`: `{ id, name, shortName, era, corePhilosophy, keyConcepts: string[], method, vocabulary, writingStyle, quirks, antiPatterns, model: string }`
  - Create `src/types/summary.ts`:
    - `SummaryGenerateRequest`: zod schema for summary API
    - `SummaryResponse`: `{ sessionId, content, createdAt }`
  - Create `src/types/index.ts` — barrel export
  - Write Vitest tests for zod schemas (valid/invalid inputs)
  - Verify TypeScript compilation with strict mode

  **Must NOT do**:
  - Do NOT implement any logic using these types
  - Do NOT create philosopher config objects (Task 5 does that)
  - Do NOT create API routes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type-only work — no runtime logic. Straightforward type definitions and zod schemas.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `tdd`: Types don't need TDD — zod validation tests are sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 5)
  - **Blocks**: Tasks 5, 8, 9, 10, 11, 12, 13
  - **Blocked By**: Task 1

  **References**:
  - `src/types/` (created by Task 1) — Target directory
  - Official docs: `https://zod.dev/?id=basic-usage` — Zod validation syntax
  - Official docs: `https://www.typescriptlang.org/docs/handbook/2/everyday-types.html` — TypeScript types

  **Acceptance Criteria**:
  - [ ] `bun run build` compiles without type errors
  - [ ] `bun test` passes zod schema validation tests (valid dilemma, empty dilemma, too long dilemma)
  - [ ] `DebatePhase` union type has exactly 7 members

  **QA Scenarios**:

  ```
  Scenario: Happy path — zod validates correct input
    Tool: Bash
    Preconditions: Vitest configured, types defined
    Steps:
      1. bun test --run tests/types.test.ts
      2. Assert test "DebateRequest schema validates correct dilemma" passes
      3. Assert test "DebateRequest schema rejects empty dilemma" passes
      4. Assert test "DebateRequest schema rejects too-long dilemma (>2000 chars)" passes
    Expected Result: Zod schemas correctly validate and reject inputs
    Failure Indicators: Incorrect validation, test failure
    Evidence: .sisyphus/evidence/task-4-types-test.txt

  Scenario: Edge case — TypeScript strict mode
    Tool: Bash
    Preconditions: tsconfig.json has "strict": true
    Steps:
      1. bun run build 2>&1
      2. Assert no "implicit any" errors
      3. Assert no "possibly undefined" errors
    Expected Result: Clean build with strict mode
    Failure Indicators: TypeScript errors
    Evidence: .sisyphus/evidence/task-4-build.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-4-types-test.txt`: Zod test output
  - [ ] `task-4-build.txt`: Build output

  **Commit**: YES (groups with 4)
  - Message: `feat: add shared type definitions`
  - Files: `src/types/*.ts`, `tests/types.test.ts`

- [x] 5. Philosopher Persona Prompts (7 Files)

  **What to do**:
  - Create 7 TypeScript files in `src/philosophers/`, one per philosopher
  - Each file exports a `PhilosopherConfig` object with the structured persona template
  - Base each persona on the user's philosophical reference document (the text about praxis, neurodivergence, logos, artifice)
  - Structure per persona (following SPASM paper template):
    ```typescript
    export const heidegger: PhilosopherConfig = {
      id: 'heidegger',
      name: 'Martin Heidegger',
      shortName: 'Heidegger',
      era: '1889-1976, Alemanha',
      corePhilosophy: `[2-3 sentences capturing their essential view, informed by the reference doc]`,
      keyConcepts: [
        { term: 'Dasein', definition: '...' },
        // 3-5 concepts
      ],
      method: 'Fenomenologia hermenêutica',
      vocabulary: ['Dasein', 'ser-no-mundo', 'Stimmung', ...],
      writingStyle: '[description]',
      quirks: '[specific mannerisms]',
      antiPatterns: ['Não reduzir a máximas simplistas', 'Não ignorar a diferença ontológica', ...],
      model: 'anthropic/claude-sonnet-4-5',
      systemPrompt: `[Full system prompt in pt-BR, derived from the reference document]`
    };
    ```
  - Personas to create (7):
    1. **Heidegger** — autenticidade, Dasein, Stimmung, ser-para-a-morte
    2. **Nietzsche** — amor fati, vontade de potência, "assim eu quis", estilo aforístico
    3. **Schopenhauer** — valor intrínseco do ser, crítica à opinião externa, ofício
    4. **Camus** — absurdo, Sísifo feliz, qualidade técnica, revolta
    5. **Byung-Chul Han** — morte sistêmica estrutural, sociedade do cansaço, transparência
    6. **Kosík** — praxis histórica e coletiva, totalidade concreta
    7. **Sennett** — o artífice, conhecimento tácito, o fazer que precede o saber
  - Create `src/philosophers/index.ts` — barrel export (array of all 7)
  - Write unit tests:
    - Test that all 7 personas export valid `PhilosopherConfig`
    - Test that each `systemPrompt` is non-empty and contains the philosopher's name
    - Test that no two philosophers share the same `id` or `shortName`
    - Test that each has at least 2 `antiPatterns`
  - Each system prompt MUST include: "Responda sempre em português brasileiro, no estilo de [nome]."

  **Must NOT do**:
  - Do NOT abstract into a base class or factory
  - Do NOT store persona configs in the database
  - Do NOT create a UI for editing personas
  - Do NOT use generic placeholder text — every prompt must be specific and derived from the reference document

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Primary work is crafting high-quality, nuanced philosophical text — not coding. Requires deep understanding of the philosophical reference document.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `tdd`: Tests validate the prompts exist and are well-formed, but the prompt content itself is creative writing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 8, 10, 12
  - **Blocked By**: Task 4 (needs PhilosopherConfig type)

  **References**:
  - User's philosophical reference document (included in initial message) — Primary source for persona content:
    - Heidegger: autenticidade, Stimmung como abertura ao mundo, ser-para-a-morte, Das Man
    - Nietzsche: amor fati, "assim eu quis", vontade de potência, máscara consciente
    - Schopenhauer: valorizar o ser, qualidade técnica do ofício, não opinião externa
    - Camus: levar a pedra a sério, Sísifo feliz, absurdo do sistema
    - Han: morte sistêmica estrutural, esgotamento sem autenticidade plena
    - Kosík: praxis histórica e coletiva, transformação individual não basta
    - Sennett: conhecimento que emerge no contato com o material, sentir primeiro
  - SPASM paper (`https://arxiv.org/abs/2604.09212`) — Persona engineering framework: structured template, anti-pattern enforcement, egocentric projection
  - `src/types/philosopher.ts` (created by Task 4) — `PhilosopherConfig` type definition

  **Acceptance Criteria**:
  - [ ] `src/philosophers/` contains exactly 7 files (heidegger.ts, nietzsche.ts, schopenhauer.ts, camus.ts, han.ts, kosik.ts, sennett.ts) plus index.ts
  - [ ] `bun test` passes: all 7 personas valid, unique IDs, non-empty prompts, anti-patterns present
  - [ ] Each `systemPrompt` contains the phrase "Responda sempre em português brasileiro"
  - [ ] `src/philosophers/index.ts` exports an array `philosophers` with exactly 7 entries

  **QA Scenarios**:

  ```
  Scenario: Happy path — all 7 personas load correctly
    Tool: Bash
    Preconditions: Philosopher files written
    Steps:
      1. bun test --run tests/philosophers.test.ts
      2. Assert test "7 philosophers exported" passes
      3. Assert test "all systemPrompts non-empty" passes
      4. Assert test "all IDs unique" passes
      5. Assert test "all antiPatterns present (min 2 each)" passes
    Expected Result: All validation tests pass
    Failure Indicators: Missing philosopher, duplicate ID, empty prompt
    Evidence: .sisyphus/evidence/task-5-philosophers-test.txt

  Scenario: Edge case — pt-BR enforcement
    Tool: Bash
    Preconditions: Philosopher files written
    Steps:
      1. grep -l "Responda sempre em português brasileiro" src/philosophers/*.ts | wc -l
      2. Assert count equals 7
    Expected Result: All 7 system prompts contain Portuguese language directive
    Failure Indicators: Count < 7 (some philosopher might respond in English)
    Evidence: .sisyphus/evidence/task-5-ptbr-check.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-5-philosophers-test.txt`: Test output
  - [ ] `task-5-ptbr-check.txt`: pt-BR directive check

  **Commit**: YES (groups with 5)
  - Message: `feat: add 7 philosopher persona prompts`
  - Files: `src/philosophers/*.ts`, `tests/philosophers.test.ts`

- [x] 6. Health Endpoint + k8s Probes Config

  **What to do**:
  - Create `src/app/api/health/route.ts` — GET handler returning:
    ```json
    { "status": "ok", "db": "connected", "timestamp": "..." }
    ```
  - Add DB connectivity check (simple `SELECT 1` via Prisma)
  - Set appropriate HTTP headers (no-cache)
  - Write unit test: mock Prisma, test healthy and unhealthy states
  - Define k8s probe endpoints: `/api/health` for startup, liveness, readiness

  **Must NOT do**:
  - Do NOT expose any sensitive info (no API keys, no DB URLs)
  - Do NOT add logging (handled by platform)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single route handler, minimal logic, well-defined contract.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10, 11)
  - **Blocks**: Task 18 (k8s manifests reference health endpoint)
  - **Blocked By**: Tasks 1, 3, 4

  **References**:
  - `src/app/api/health/route.ts` (created by Task 6) — Health endpoint
  - Official docs: `https://nextjs.org/docs/app/api-reference/file-conventions/route` — Route handlers
  - k8s docs: `https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/` — Probe configuration

  **Acceptance Criteria**:
  - [ ] `GET /api/health` returns 200 with `{"status":"ok","db":"connected"}`
  - [ ] When DB is down, returns 503 with `{"status":"error","db":"disconnected"}`
  - [ ] `bun test` passes: health endpoint healthy + unhealthy states

  **QA Scenarios**:

  ```
  Scenario: Happy path — healthy endpoint
    Tool: Bash (curl)
    Preconditions: App running, DB connected
    Steps:
      1. curl -s http://localhost:3000/api/health | jq .
      2. Assert response.status === "ok"
      3. Assert response.db === "connected"
      4. Assert response.timestamp is present
      5. Assert HTTP status is 200
    Expected Result: Clean health check response
    Failure Indicators: Wrong status code, missing db field
    Evidence: .sisyphus/evidence/task-6-health.json

  Scenario: Failure — DB disconnected
    Tool: Bash (curl)
    Preconditions: App running, DB intentionally unreachable
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
      2. Assert HTTP status is 503
    Expected Result: 503 Service Unavailable when DB is down
    Failure Indicators: Returns 200 despite DB failure
    Evidence: .sisyphus/evidence/task-6-health-down.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-6-health.json`: Healthy response
  - [ ] `task-6-health-down.txt`: Error response status

  **Commit**: YES
  - Message: `feat: add health endpoint`
  - Files: `src/app/api/health/route.ts`, `tests/health.test.ts`

- [x] 7. Anonymous Session Middleware

  **What to do**:
  - Create `src/lib/session.ts`:
    - `getOrCreateSessionId()` — reads cookie `taberna-sid`, creates UUID if absent, sets httpOnly cookie (1h TTL)
    - `getSessionId()` — reads existing cookie
    - `clearSession()` — removes cookie
  - Create `src/middleware.ts` — Next.js middleware that:
    - Intercepts all `/api/*` routes
    - Ensures `taberna-sid` cookie exists
    - Attaches sessionId to request headers for API routes
  - Write unit tests: new session created, existing session read, session cleared
  - Write integration test: two requests with same cookie get same sessionId

  **Must NOT do**:
  - Do NOT create user accounts or login flow
  - Do NOT use `sessionStorage` or `localStorage` (SSR-incompatible)
  - Do NOT store any PII in the session

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard cookie-based session pattern. No complex logic.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9, 10, 11)
  - **Blocks**: Task 12 (API route uses session middleware)
  - **Blocked By**: Tasks 1, 3, 4

  **References**:
  - `src/middleware.ts` (created by Task 7) — Next.js middleware
  - Official docs: `https://nextjs.org/docs/app/building-your-application/routing/middleware` — Middleware API
  - `src/types/debate.ts` (created by Task 4) — `DebateRequest` type with optional sessionId

  **Acceptance Criteria**:
  - [ ] First request to `/api/health` sets `taberna-sid` cookie in response
  - [ ] Subsequent request with same cookie uses same sessionId
  - [ ] `bun test` passes: new session, existing session, clear session

  **QA Scenarios**:

  ```
  Scenario: Happy path — session created and persisted
    Tool: Bash (curl)
    Preconditions: App running
    Steps:
      1. curl -v -c /tmp/cookies.txt http://localhost:3000/api/health 2>&1
      2. Assert response contains "Set-Cookie: taberna-sid="
      3. curl -b /tmp/cookies.txt http://localhost:3000/api/health 2>&1
      4. Assert no new "Set-Cookie" header (existing session reused)
    Expected Result: Cookie set once, reused on subsequent requests
    Failure Indicators: No cookie set, new cookie on every request
    Evidence: .sisyphus/evidence/task-7-session-cookie.txt

  Scenario: Edge case — cookie TTL
    Tool: Bash (curl)
    Preconditions: App running
    Steps:
      1. curl -v http://localhost:3000/api/health 2>&1 | grep "Set-Cookie"
      2. Assert "Max-Age=3600" or "Expires" with 1h from now
    Expected Result: Cookie expires in 1 hour
    Failure Indicators: No expiry, wrong TTL
    Evidence: .sisyphus/evidence/task-7-cookie-ttl.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-7-session-cookie.txt`: Cookie set/reuse verification
  - [ ] `task-7-cookie-ttl.txt`: TTL verification

  **Commit**: YES
  - Message: `feat: add anonymous session middleware`
  - Files: `src/lib/session.ts`, `src/middleware.ts`, `tests/session.test.ts`

- [x] 8. Debate Orchestrator (Round Manager)

  **What to do**:
  - Create `src/lib/debate/round-manager.ts`:
    - `debateOrchestrator(dilemma: string, philosophers: PhilosopherConfig[], sessionId: string) → AsyncGenerator<DebateEvent>`
    - Flow: Round 1 (parallel) → project context → Round 2 (sequential rebuttals with AI selector for turn order) → yield user-intervention event → wait for user input → Round 3 (parallel with user input injected)
    - Each philosopher call: `streamText()` from Vercel AI SDK, yield `{ type: 'token', philosopherId, content }` events
    - Round completion: yield `{ type: 'round-complete', round }` event
    - Error handling: if 1 philosopher fails, yield `{ type: 'philosopher-error', philosopherId }` and continue
  - Create `src/lib/debate/ai-selector.ts`:
    - `selectNextSpeaker(context: string, remainingPhilosophers: PhilosopherConfig[]) → Promise<string>`
    - Uses lightweight model (GPT-4o-mini) to choose who speaks next based on conversation context
    - Prevents same philosopher speaking twice in a row
  - Write unit tests (mock `streamText`):
    - Test round 1 yields 7 philosopher-start events
    - Test round 2 yields correct number of events
    - Test round 3 includes user intervention text
    - Test error: 1 philosopher fails, 6 continue
    - Test empty dilemma rejection
  - Create `src/lib/debate/index.ts` — barrel export

  **Must NOT do**:
  - Do NOT create a "generic debate engine" or abstract class
  - Do NOT implement the HTTP layer (API route is Task 12)
  - Do NOT handle summary generation (Task 13)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core business logic with complex async flow, streaming, parallel execution, error recovery. Requires thorough understanding of Vercel AI SDK and debate mechanics.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `tdd`: Tests are written first (TDD workflow), but the deep reasoning about debate flow requires the deep category

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9, 10, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 4, 5

  **References**:
  - `src/types/debate.ts` (Task 4) — `DebateEvent`, `DebatePhase` types
  - `src/types/philosopher.ts` (Task 4) — `PhilosopherConfig` type
  - `src/philosophers/index.ts` (Task 5) — Array of all 7 philosophers
  - Vercel AI SDK docs: `https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text` — `streamText()` API
  - Vercel AI SDK docs: `https://sdk.vercel.ai/docs/agents/subagents` — Subagent pattern for philosopher calls
  - OSS reference: `https://github.com/chatsparty/chatsparty` — AI Selector turn-taking pattern
  - OSS reference: `https://github.com/excing/WebMultiAgentChat` — Multi-agent round-robin with anti-repetition

  **Acceptance Criteria**:
  - [ ] `debateOrchestrator` yields at least 7 `philosopher-start` events in round 1
  - [ ] Round 2 begins only after all round 1 responses complete
  - [ ] User intervention text appears in round 3 philosopher contexts
  - [ ] `bun test` passes: round counting, error isolation, empty dilemma rejection

  **QA Scenarios**:

  ```
  Scenario: Happy path — full 3-round debate (mocked)
    Tool: Bash (bun test)
    Preconditions: Mocked streamText, 7 philosopher configs
    Steps:
      1. bun test --run tests/debate/round-manager.test.ts
      2. Assert test "round 1 yields 7 philosopher-start events" passes
      3. Assert test "round 2 yields rebuttal events" passes
      4. Assert test "round 3 includes user intervention" passes
      5. Assert test "events yield in correct phase order" passes
    Expected Result: All debate flow tests pass
    Failure Indicators: Wrong event count, phase ordering error
    Evidence: .sisyphus/evidence/task-8-debate-test.txt

  Scenario: Failure — 1 philosopher errors, others continue
    Tool: Bash (bun test)
    Preconditions: Mocked streamText where 1/7 throws
    Steps:
      1. bun test --run tests/debate/round-manager.test.ts -t "philosopher error isolation"
      2. Assert 6 philosophers complete (complete events)
      3. Assert 1 philosopher-error event yielded
      4. Assert debate continues to round 2 (not aborted)
    Expected Result: Single philosopher failure doesn't crash the debate
    Failure Indicators: Debate crash, all philosophers fail
    Evidence: .sisyphus/evidence/task-8-error-isolation.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-8-debate-test.txt`: Full debate flow tests
  - [ ] `task-8-error-isolation.txt`: Error isolation test

  **Commit**: YES
  - Message: `feat: add debate round manager`
  - Files: `src/lib/debate/round-manager.ts`, `src/lib/debate/ai-selector.ts`, `src/lib/debate/index.ts`, `tests/debate/round-manager.test.ts`

- [x] 9. Context Projection Engine

  **What to do**:
  - Create `src/lib/debate/context-projection.ts`:
    - `projectContext(allResponses: PhilosopherResponse[], targetPhilosopher: PhilosopherConfig, dilemma: string, round: number) → string`
    - Implements Egocentric Context Projection (ECP) from SPASM paper:
      - For each philosopher, format history as: "O usuário disse: [dilemma]. [Philosopher X] respondeu: [content]. Você é [target]. Como você responde?"
      - Labels each speaker explicitly — never passes raw conversation
      - Injects the target philosopher's own previous response (if any) for continuity
    - Round-specific formatting:
      - Round 1: Just dilemma + philosopher role
      - Round 2: Dilemma + all round-1 responses (labeled)
      - Round 3: Full history + user intervention
  - Write unit tests:
    - Test context includes all previous responses
    - Test context labels each speaker by name
    - Test context includes target philosopher's own previous response
    - Test round-specific detail levels
  - Create `src/lib/debate/context-projection.test.ts`

  **Must NOT do**:
  - Do NOT modify philosopher system prompts directly in context
  - Do NOT truncate history (let model handle context window)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — string formatting + iteration over responses. Requires understanding of SPASM paper's ECP concept.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 10, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 4, 5

  **References**:
  - SPASM paper (`https://arxiv.org/abs/2604.09212`) — Egocentric Context Projection: Section 3.2, "preventing persona drift through speaker-labeled history"
  - `src/types/debate.ts` (Task 4) — `PhilosopherResponse` type
  - `src/types/philosopher.ts` (Task 4) — `PhilosopherConfig` type

  **Acceptance Criteria**:
  - [ ] `projectContext` output includes the phrase "Você é [philosopher name]"
  - [ ] Context for round 2 includes all 7 round-1 responses with speaker labels
  - [ ] Context for round 3 includes user intervention text
  - [ ] `bun test` passes: context completeness, speaker labeling, round differentiation

  **QA Scenarios**:

  ```
  Scenario: Happy path — round 2 context projection
    Tool: Bash (bun test)
    Preconditions: Mocked PhilosopherResponse[] with 7 entries, Heidegger as target
    Steps:
      1. bun test --run tests/debate/context-projection.test.ts -t "round 2 includes all previous responses"
      2. Assert output contains "Nietzsche respondeu:"
      3. Assert output contains "Camus respondeu:"
      4. Assert output contains "Você é Martin Heidegger"
      5. Assert output contains the original dilemma text
    Expected Result: Full labeled history in context
    Failure Indicators: Missing philosopher labels, missing responses, wrong target
    Evidence: .sisyphus/evidence/task-9-context-projection.txt

  Scenario: Edge case — round 1 (no previous responses)
    Tool: Bash (bun test)
    Preconditions: Empty PhilosopherResponse[], Heidegger as target
    Steps:
      1. bun test --run tests/debate/context-projection.test.ts -t "round 1 has no previous responses"
      2. Assert output does NOT contain "respondeu:" (no previous speakers)
      3. Assert output contains the dilemma
      4. Assert output contains "Você é Martin Heidegger"
    Expected Result: Clean context with just dilemma + role
    Failure Indicators: References to non-existent previous responses
    Evidence: .sisyphus/evidence/task-9-round1-context.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-9-context-projection.txt`: Round 2 context test output
  - [ ] `task-9-round1-context.txt`: Round 1 context test output

  **Commit**: YES
  - Message: `feat: add context projection engine`
  - Files: `src/lib/debate/context-projection.ts`, `tests/debate/context-projection.test.ts`

- [x] 10. LLM Provider Setup + Streaming

  **What to do**:
  - Create `src/lib/llm/provider.ts`:
    - `getPhilosopherModel(config: PhilosopherConfig): LanguageModelV2`
    - Uses Vercel AI SDK provider: `anthropic()` or `openai()` based on config.model
    - Maps philosopher config to `streamText()` parameters: model, system, temperature, maxTokens
  - Create `src/lib/llm/stream.ts`:
    - `streamPhilosopherResponse(config: PhilosopherConfig, context: string) → AsyncGenerator<{content: string, finishReason: string}>`
    - Wraps `streamText()` call with proper error handling and timeout (60s per philosopher)
    - Yields tokens individually for UI streaming
  - Pin `ai` to exact version `6.0.0-beta.128` in `package.json`
  - Add smoke test: real API call to verify streaming works
  - Create `src/lib/llm/index.ts` — barrel export
  - Write unit tests (mock streamText):
    - Test model selection based on config
    - Test timeout handling (simulate slow response)
    - Test error wrapping (API key invalid, rate limit)
  - Write integration test (conditional: skip if no API key)

  **Must NOT do**:
  - Do NOT import LangChain — Vercel AI SDK only
  - Do NOT hardcode API keys in source (must read from env)
  - Do NOT add retry logic (simplicity over resilience for v1)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Medium complexity — Vercel AI SDK integration with specific streaming patterns, error handling, timeout management.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 4, 5

  **References**:
  - Vercel AI SDK docs: `https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text` — `streamText()` API with async generator pattern
  - Vercel AI SDK docs: `https://sdk.vercel.ai/docs/providers/anthropic` — Anthropic provider configuration
  - Vercel AI SDK docs: `https://sdk.vercel.ai/docs/providers/openai` — OpenAI provider configuration (for lightweight selector model)
  - `src/types/philosopher.ts` (Task 4) — `PhilosopherConfig.model` field
  - `src/philosophers/*.ts` (Task 5) — Philosopher configs with model assignments

  **Acceptance Criteria**:
  - [ ] `getPhilosopherModel` returns correct provider for 'anthropic/claude-sonnet-4-5' model string
  - [ ] `streamPhilosopherResponse` yields at least one token chunk for valid input
  - [ ] Timeout (60s) triggers error event, not hang
  - [ ] `bun test` passes: model selection, timeout, error wrapping
  - [ ] Smoke test (if ANTHROPIC_API_KEY set): real streaming works

  **QA Scenarios**:

  ```
  Scenario: Happy path — streaming tokens (mocked)
    Tool: Bash (bun test)
    Preconditions: Mocked streamText, valid PhilosopherConfig
    Steps:
      1. bun test --run tests/llm/stream.test.ts -t "yields token chunks"
      2. Assert at least 3 chunks yielded
      3. Assert each chunk has non-empty content
      4. Assert final chunk has finishReason
    Expected Result: Token-by-token streaming works
    Failure Indicators: No chunks, empty chunks, missing finishReason
    Evidence: .sisyphus/evidence/task-10-stream-test.txt

  Scenario: Failure — API key invalid
    Tool: Bash (bun test)
    Preconditions: ANTHROPIC_API_KEY set to "invalid-key"
    Steps:
      1. bun test --run tests/llm/stream.test.ts -t "handles authentication error"
      2. Assert error is thrown with status 401 or "Unauthorized"
      3. Assert error doesn't crash the process
    Expected Result: Graceful error on auth failure
    Failure Indicators: Uncaught error, process crash
    Evidence: .sisyphus/evidence/task-10-auth-error.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-10-stream-test.txt`: Streaming test output
  - [ ] `task-10-auth-error.txt`: Error handling test output

  **Commit**: YES
  - Message: `feat: add LLM provider setup with streaming`
  - Files: `src/lib/llm/provider.ts`, `src/lib/llm/stream.ts`, `src/lib/llm/index.ts`, `tests/llm/stream.test.ts`

- [x] 11. Philosopher Card Component

  **What to do**:
  - Create `src/components/PhilosopherCard.tsx`:
    - Props: `philosopher: PhilosopherConfig`, `response: PhilosopherResponse | null`, `isActive: boolean`
    - States: `idle` (philosopher portrait + name), `streaming` (animated token-by-token text with typing cursor), `complete` (full response with subtle fade), `error` ("meditando em silêncio" with faint opacity)
    - Art nouveau decorative border using CSS (Task 2 design tokens)
    - Color accent per philosopher (CSS variable per philosopher ID)
    - Framer Motion: card appears with stagger animation, text fades in
    - Accessible: `aria-live="polite"` for streaming text, `aria-label` on card
  - Create `src/components/PhilosopherCard.test.tsx`:
    - Test renders philosopher name in all states
    - Test streaming state shows content token-by-token
    - Test error state shows "meditando em silêncio"
    - Test complete state removes typing cursor
  - Add Storybook-compatible stories (optional, nice-to-have)

  **Must NOT do**:
  - Do NOT add any interactive elements (no buttons, no expand/collapse)
  - Do NOT add vote/like/dislike functionality
  - Do NOT add philosopher-specific illustrations (CSS-only decoration)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Rich visual component with multiple states, animations, and art nouveau styling. Requires design sensibility.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Designer-turned-developer — crafts polished UI components from text descriptions without mockups.
  - **Skills Evaluated but Omitted**:
    - `playwright`: Component-level tests use React Testing Library; Playwright used in integration tasks

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 10)
  - **Blocks**: Tasks 14, 15
  - **Blocked By**: Tasks 2, 4

  **References**:
  - `src/types/philosopher.ts` (Task 4) — `PhilosopherConfig` type
  - `src/types/debate.ts` (Task 4) — `PhilosopherResponse` type
  - `tailwind.config.ts` (Task 2) — Design tokens for card colors
  - OSS reference: `https://github.com/chatsparty/chatsparty` — Chat party UI with multi-agent cards
  - `src/components/TavernBackground.tsx` (Task 2) — Background texture (parent context)

  **Acceptance Criteria**:
  - [ ] Card renders philosopher name in all 4 states (idle, streaming, complete, error)
  - [ ] Streaming state shows `aria-live="polite"` for accessibility
  - [ ] Error state displays "meditando em silêncio..." text
  - [ ] `bun test` passes: all 4 states verified

  **QA Scenarios**:

  ```
  Scenario: Happy path — streaming state renders tokens
    Tool: Playwright
    Preconditions: App running, PhilosopherCard mounted with streaming response
    Steps:
      1. Navigate to http://localhost:3000 (with mock debate data)
      2. Assert card for "Martin Heidegger" is visible
      3. Wait for text content to appear incrementally
      4. Assert card has class indicating streaming state
      5. Assert `aria-live="polite"` present on text container
    Expected Result: Token-by-token text visible with screen reader support
    Failure Indicators: Card not found, text not appearing, missing aria
    Evidence: .sisyphus/evidence/task-11-card-streaming.png

  Scenario: Edge case — error state
    Tool: Playwright
    Preconditions: PhilosopherCard mounted with error response
    Steps:
      1. Navigate to page showing error card
      2. Assert card has reduced opacity (error visual state)
      3. Assert text contains "meditando em silêncio"
      4. Assert no typing cursor animation
    Expected Result: Graceful error display
    Failure Indicators: Card looks same as streaming, error text missing
    Evidence: .sisyphus/evidence/task-11-card-error.png
  ```

  **Evidence to Capture**:
  - [ ] `task-11-card-streaming.png`: Streaming state screenshot
  - [ ] `task-11-card-error.png`: Error state screenshot

  **Commit**: YES
  - Message: `feat: add philosopher card component`
  - Files: `src/components/PhilosopherCard.tsx`, `tests/components/PhilosopherCard.test.tsx`

- [x] 12. POST /api/debate Route (Full 3-Round Flow)

  **What to do**:
  - Create `src/app/api/debate/route.ts` — POST handler:
    - Parse request body with zod (`DebateRequest` schema from Task 4)
    - Get or create session via middleware (Task 7)
    - Create `DebateSession` in DB (Prisma) with status ACTIVE
    - Call `debateOrchestrator()` (Task 8) which returns `AsyncGenerator<DebateEvent>`
    - Stream events as SSE (`text/event-stream`) with `ReadableStream`
    - SSE event types: `token`, `philosopher-start`, `philosopher-done`, `philosopher-error`, `round-complete`, `waiting-for-user`, `debate-complete`
    - After round 2: yield `waiting-for-user` event, pause stream, wait for client to POST again with `{ action: 'intervene', text: '...' }`
    - After debate complete: update `DebateSession.status` to COMPLETED
    - Error handling: wrap in try-catch, send error SSE event, don't crash
  - Handle second POST (user intervention): detect `action: 'intervene'` in body, resume orchestrator
  - Write integration tests (mock streamText):
    - Test POST with valid dilemma returns SSE stream
    - Test SSE events arrive in correct order
    - Test user intervention flow (POST → get waiting-for-user → POST with intervention → get round 3)
    - Test empty dilemma returns 400
    - Test 1 philosopher fails, stream continues
  - Set CORS headers (for same-origin only)
  - Set appropriate timeout (5 minutes max per debate)

  **Must NOT do**:
  - Do NOT use WebSockets — SSE only for simplicity
  - Do NOT persist full conversation history (only PhilosopherRound rows for context projection)
  - Do NOT implement summary generation (separate endpoint, Task 13)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Critical integration point combining SSE streaming, session management, debate orchestration, and DB persistence. Multiple async flows, state management across requests.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with Tasks 13, 14, 15, 16)
  - **Blocks**: Tasks 14, 16, 20
  - **Blocked By**: Tasks 7, 8, 9, 10

  **References**:
  - Next.js docs: `https://nextjs.org/docs/app/api-reference/file-conventions/route` — Route handler with streaming
  - MDN: `https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events` — SSE protocol
  - Vercel AI SDK docs: `https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text` — streamText output format
  - `src/lib/debate/round-manager.ts` (Task 8) — `debateOrchestrator` function
  - `src/lib/session.ts` (Task 7) — Session helper
  - `src/lib/db/prisma.ts` (Task 3) — Prisma client

  **Acceptance Criteria**:
  - [ ] `POST /api/debate` with `{"dilemma": "Devo mudar de carreira?"}` returns SSE stream with `text/event-stream`
  - [ ] Stream yields `round-complete` event after each round
  - [ ] Stream yields `waiting-for-user` event after round 2 (not before)
  - [ ] Second POST with `{"action": "intervene", "text": "..."}` resumes stream for round 3
  - [ ] Empty dilemma returns 400 with error message
  - [ ] DebateSession saved to DB with status COMPLETED after full flow
  - [ ] `bun test` passes: SSE stream structure, user intervention, error handling

  **QA Scenarios**:

  ```
  Scenario: Happy path — full 3-round debate with intervention
    Tool: Bash (curl)
    Preconditions: App running, mocked streamText, valid session cookie
    Steps:
      1. curl -N -X POST http://localhost:3000/api/debate \
         -H "Content-Type: application/json" \
         -d '{"dilemma": "Devo mudar de carreira?"}' 2>&1 | head -50
      2. Assert first event contains "event: philosopher-start"
      3. Assert "event: round-complete" appears for round 1
      4. Assert "event: round-complete" appears for round 2
      5. Assert "event: waiting-for-user" appears (not round-complete after round 2)
    Expected Result: Stream flows through rounds 1-2, waits for user
    Failure Indicators: Missing events, wrong order, no waiting-for-user
    Evidence: .sisyphus/evidence/task-12-debate-stream.txt

  Scenario: Edge case — empty dilemma rejection
    Tool: Bash (curl)
    Preconditions: App running
    Steps:
      1. curl -s -X POST http://localhost:3000/api/debate \
         -H "Content-Type: application/json" \
         -d '{"dilemma": ""}' -w "\n%{http_code}"
      2. Assert HTTP status is 400
      3. Assert response contains error message about minimum length
    Expected Result: 400 with clear validation error
    Failure Indicators: 200 OK on empty dilemma, unclear error
    Evidence: .sisyphus/evidence/task-12-empty-dilemma.txt

  Scenario: Edge case — philosopher failure during debate
    Tool: Bash (curl)
    Preconditions: Mock 1/7 philosopher to throw error
    Steps:
      1. curl -N -X POST http://localhost:3000/api/debate \
         -H "Content-Type: application/json" \
         -d '{"dilemma": "Test"}' 2>&1 | grep "event: philosopher-error"
      2. Assert at least 1 philosopher-error event
      3. Assert debate continues (round-complete events still appear)
      4. Assert 6 philosopher-done events (not 7)
    Expected Result: Error isolated, debate continues
    Failure Indicators: Stream ends on error, all philosophers fail
    Evidence: .sisyphus/evidence/task-12-error-isolation.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-12-debate-stream.txt`: Full stream output (first 50 lines)
  - [ ] `task-12-empty-dilemma.txt`: Validation error response
  - [ ] `task-12-error-isolation.txt`: Error isolation stream

  **Commit**: YES
  - Message: `feat: add POST /api/debate route with 3-round flow`
  - Files: `src/app/api/debate/route.ts`, `tests/api/debate.test.ts`

- [x] 13. POST /api/summary Route (Narrative Generation)

  **What to do**:
  - Create `src/app/api/summary/route.ts` — POST handler:
    - Accept `{ sessionId: string, responses: PhilosopherResponse[], dilemma: string }`
    - Build summary prompt: literary tavern narrative style in pt-BR
    - Call `generateText()` (not stream) with a cheaper model (Claude Haiku or GPT-4o-mini)
    - Save `Summary` to DB with `sessionId` foreign key
    - Return `{ content: string, createdAt: string }`
  - Summary prompt template:
    ```
    Você é o narrador da Taberna. Escreva um parágrafo literário (150-250 palavras)
    em português brasileiro resumindo o debate desta noite.

    Formato: "Na noite de [data], sob a luz âmbar da Taberna, [nome do usuário ou 'um viajante']
    trouxe o seguinte dilema: '[dilema]'. [Resumo poético do que cada filósofo contribuiu,
    destacando tensões e convergências]. A noite seguiu..."

    Tom: boêmio, literário, levemente melancólico, com toques de absinto e sabedoria.
    ```
  - Write unit tests:
    - Test summary prompt includes all philosopher names
    - Test summary saved to DB
    - Test summary respects max length (500 words)
  - Write integration test: real API call with mock responses

  **Must NOT do**:
  - Do NOT stream the summary (one-shot generation)
  - Do NOT expose the raw prompt to the client

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Medium complexity — prompt construction, LLM call, DB persistence. Literary quality matters.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 14, 15, 16)
  - **Blocks**: Task 14, 20
  - **Blocked By**: Tasks 3, 4, 10

  **References**:
  - `prisma/schema.prisma` (Task 3) — `Summary` model
  - `src/types/summary.ts` (Task 4) — Type definitions
  - `src/lib/llm/provider.ts` (Task 10) — `generateText()` for non-streaming generation
  - Vercel AI SDK docs: `https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text` — `generateText()` API

  **Acceptance Criteria**:
  - [ ] `POST /api/summary` with valid data returns `{ content, createdAt }` with status 200
  - [ ] Summary saved to DB (queryable via Prisma)
  - [ ] Summary contains the dilemma text (not just a generic note)
  - [ ] Summary is in Portuguese and follows literary tavern style
  - [ ] `bun test` passes: prompt structure, DB persistence, Portuguese detection

  **QA Scenarios**:

  ```
  Scenario: Happy path — summary generated and persisted
    Tool: Bash (curl + bun)
    Preconditions: App running, mock LLM response, valid sessionId
    Steps:
      1. curl -s -X POST http://localhost:3000/api/summary \
         -H "Content-Type: application/json" \
         -d '{"sessionId":"test-123","dilemma":"Devo mudar de carreira?","responses":[...]}' | jq .
      2. Assert response.content is non-empty string
      3. Assert response.createdAt is valid ISO date
      4. bun run prisma db execute --stdin <<< "SELECT content FROM \"Summary\" WHERE \"sessionId\"='test-123'"
      5. Assert row exists with matching content
    Expected Result: Summary generated and persisted
    Failure Indicators: Empty content, missing DB row
    Evidence: .sisyphus/evidence/task-13-summary.json

  Scenario: Edge case — Portuguese language check
    Tool: Bash (curl)
    Preconditions: App running, mock LLM
    Steps:
      1. curl -s -X POST http://localhost:3000/api/summary \
         -H "Content-Type: application/json" \
         -d '{"sessionId":"test-lang","dilemma":"...","responses":[...]}' | jq -r .content
      2. Assert content contains Portuguese words (check for "na noite de", "sob", "trouxe", etc.)
      3. Assert content does NOT start with English pattern ("On the night of")
    Expected Result: Summary in Portuguese
    Failure Indicators: Summary in English, mixed language
    Evidence: .sisyphus/evidence/task-13-ptbr-check.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-13-summary.json`: Summary API response
  - [ ] `task-13-ptbr-check.txt`: Portuguese language verification

  **Commit**: YES
  - Message: `feat: add POST /api/summary route for narrative generation`
  - Files: `src/app/api/summary/route.ts`, `tests/api/summary.test.ts`

- [x] 14. Main Page Component (Input + Debate Grid + Summary)

  **What to do**:
  - Create `src/app/layout.tsx`:
    - Import Google Fonts (Playfair Display, Inter)
    - Set metadata: title "Taberna", description
    - Wrap with `TavernBackground` (Task 2)
    - No nav, no footer (single-page app)
  - Create `src/app/page.tsx` (client component — needs `'use client'`):
    - **Input area**: Textarea with placeholder "Compartilhe seu dilema com os filósofos..."
      - Character counter (10-500 chars)
      - Submit button (visually: copper accent, "Oferecer aos Filósofos")
      - Disabled during active debate
    - **Debate grid**: CSS Grid, 3 columns desktop, 1 column mobile
      - 7 `PhilosopherCard` components (Task 11)
      - Cards appear with stagger animation (Framer Motion `staggerChildren`)
      - During streaming: each card updates independently
      - Between rounds: subtle divider + round label ("Rodada 1", "Réplicas", "Últimas Palavras")
    - **Intervention area**: Appears between rounds 2 and 3
      - Text input: "Intervenha no debate..."
      - Submit button: "Oferecer sua Perspectiva"
    - **Summary area**: Appears after debate completes
      - Scroll-down reveal animation
      - Markdown rendering of narrative summary
      - Decorative frame (art nouveau border)
    - **State machine**: `useReducer` with DebateState (Task 4)
    - **SSE consumption**: `fetch` + `ReadableStream` reader, dispatch events to reducer
    - **Reset button**: "Nova Noite na Taberna" — clears everything, starts fresh
  - Write component tests (React Testing Library):
    - Test submit button disabled when textarea empty
    - Test cards appear after dilemma submitted
    - Test intervention area appears after round 2
    - Test summary appears after debate complete
    - Test reset clears all state

  **Must NOT do**:
  - Do NOT create multiple pages or routes
  - Do NOT add navigation, sidebar, or header
  - Do NOT add philosopher selection/filtering UI
  - Do NOT add "save/share/export" buttons

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Primary challenge is visual composition — tavern atmosphere, card grid, animations, state transitions. All 4 visual states of the page need polished execution.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Designer-turned-developer — essential for crafting the full tavern experience from text description.
  - **Skills Evaluated but Omitted**:
    - `playwright`: Unit tests via React Testing Library; full E2E in Task 20

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 12 and 13 API routes to test against)
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 15, 16)
  - **Blocks**: Tasks 15, 20
  - **Blocked By**: Tasks 2, 11, 12, 13

  **References**:
  - `src/components/PhilosopherCard.tsx` (Task 11) — Card component to render
  - `src/types/debate.ts` (Task 4) — `DebateState`, `DebatePhase` types
  - `src/components/TavernBackground.tsx` (Task 2) — Background component
  - `src/components/DecorativeDivider.tsx` (Task 2) — Decorative divider

  **Acceptance Criteria**:
  - [ ] Page renders input textarea with placeholder text (not active yet)
  - [ ] Submit button disabled when textarea has < 10 chars
  - [ ] After submit, 7 philosopher cards appear with stagger animation
  - [ ] Intervention area appears only after round 2 complete
  - [ ] Summary renders with markdown after debate complete
  - [ ] Reset clears all state and returns to initial input view
  - [ ] `bun test` passes: input validation, card rendering, state transitions

  **QA Scenarios**:

  ```
  Scenario: Happy path — full debate flow (UI)
    Tool: Playwright
    Preconditions: App running, mock API routes
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert textarea visible with "Compartilhe seu dilema" placeholder
      3. Assert submit button disabled (textarea empty)
      4. Type "Devo mudar de carreira?" in textarea
      5. Assert submit button enabled
      6. Click submit
      7. Wait for philosopher cards to appear
      8. Assert exactly 7 cards visible (count .philosopher-card elements)
      9. Wait for "Intervenha no debate" to appear
      10. Type "O que dizem sobre medo da mudança?" and submit
      11. Wait for summary to appear with tavern literary style
    Expected Result: Complete flow from input → debate → intervention → summary
    Failure Indicators: Cards don't appear, wrong count, missing phases
    Evidence: .sisyphus/evidence/task-14-full-flow.mp4 (or series of screenshots)

  Scenario: Edge case — reset after debate
    Tool: Playwright
    Preconditions: Debate completed, summary visible
    Steps:
      1. Click "Nova Noite na Taberna" button
      2. Assert all cards removed (count .philosopher-card is 0)
      3. Assert textarea visible and empty
      4. Assert summary area hidden
    Expected Result: Clean reset to initial state
    Failure Indicators: Residual cards, summary still visible, textarea not cleared
    Evidence: .sisyphus/evidence/task-14-reset.png
  ```

  **Evidence to Capture**:
  - [ ] `task-14-full-flow.mp4` (or series of screenshots): Complete debate flow
  - [ ] `task-14-reset.png`: After reset state

  **Commit**: YES
  - Message: `feat: add main page with debate UI`
  - Files: `src/app/page.tsx`, `src/app/layout.tsx`, `tests/pages/home.test.tsx`

- [x] 15. Mobile Responsive Layout

  **What to do**:
  - Add responsive breakpoints to `src/app/page.tsx` and `src/components/PhilosopherCard.tsx`:
    - Desktop (≥1024px): 3-column grid, philosopher cards side-by-side
    - Tablet (768-1023px): 2-column grid
    - Mobile (<768px): single column, cards stack vertically, full-width textarea
  - Mobile-specific adjustments:
    - Input area: full-width, larger touch targets (min 44px tap area)
    - Cards: simplified decorative borders (less heavy CSS on mobile)
    - Stream text: slightly larger font for readability
    - Summary: full-width, no decorative frame (simplified)
  - Test with Playwright at viewport widths: 375px, 768px, 1440px
  - Run axe-core accessibility audit (WCAG AA) at 375px
  - Verify no horizontal scroll at any breakpoint
  - Test touch interactions (Playwright `hasTouch: true`)

  **Must NOT do**:
  - Do NOT create separate mobile/desktop components
  - Do NOT hide content on mobile (all 7 cards must be accessible)
  - Do NOT use `user-agent` detection (pure responsive CSS)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Responsive design implementation with accessibility audit. Pure CSS + testing work.
  - **Skills**: [`frontend-ui-ux`, `playwright`]
    - `frontend-ui-ux`: Responsive layout design — grid, breakpoints, touch-friendly sizing.
    - `playwright`: Browser testing at multiple viewports with device emulation.
  - **Skills Evaluated but Omitted**:
    - `tdd`: Visual testing via Playwright, not unit tests

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 14, 16)
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 2, 11, 14

  **References**:
  - `src/app/page.tsx` (Task 14) — Main page to add responsive classes
  - `src/components/PhilosopherCard.tsx` (Task 11) — Card to add responsive styles
  - Tailwind docs: `https://tailwindcss.com/docs/responsive-design` — Breakpoint prefixes (sm, md, lg)
  - WCAG docs: `https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html` — AA contrast ratio (4.5:1)

  **Acceptance Criteria**:
  - [ ] 1440px viewport: 3 columns of philosopher cards
  - [ ] 768px viewport: 2 columns of philosopher cards
  - [ ] 375px viewport: 1 column, full-width cards, no horizontal scroll
  - [ ] Touch targets ≥ 44px on mobile (Playwright check)
  - [ ] axe-core audit passes with 0 critical issues at 375px
  - [ ] Submit button reachable without scrolling on mobile (above fold)

  **QA Scenarios**:

  ```
  Scenario: Happy path — responsive grid
    Tool: Playwright
    Preconditions: App running, debate in progress with 7 cards visible
    Steps:
      1. Set viewport to 1440x900, take screenshot
      2. Assert grid has 3 columns (check card positions)
      3. Set viewport to 768x1024, take screenshot
      4. Assert grid has 2 columns
      5. Set viewport to 375x812, take screenshot
      6. Assert grid has 1 column, no horizontal scrollbar
      7. Assert all 7 cards visible (scroll to see all)
    Expected Result: Grid adapts correctly at each breakpoint
    Failure Indicators: Cards overlapping, cut off, horizontal scroll
    Evidence: .sisyphus/evidence/task-15-desktop.png, task-15-tablet.png, task-15-mobile.png

  Scenario: Edge case — WCAG AA contrast
    Tool: Playwright (axe-core)
    Preconditions: App running
    Steps:
      1. Navigate to http://localhost:3000
      2. Run axe-core audit with WCAG AA rules
      3. Assert 0 violations at level "serious" or "critical"
      4. If violations: list selector + issue
    Expected Result: Accessible color contrast
    Failure Indicators: Contrast violations > 0
    Evidence: .sisyphus/evidence/task-15-a11y.json
  ```

  **Evidence to Capture**:
  - [ ] `task-15-desktop.png`, `task-15-tablet.png`, `task-15-mobile.png`: Responsive screenshots
  - [ ] `task-15-a11y.json`: axe-core audit results

  **Commit**: YES
  - Message: `feat: add mobile responsive layout`
  - Files: `src/app/page.tsx`, `src/components/PhilosopherCard.tsx`

- [x] 16. Error Handling + Edge Cases

  **What to do**:
  - Create `src/components/ErrorBoundary.tsx` — React error boundary wrapping main content:
    - Catches render errors
    - Shows "A taverna está temporariamente fechada" with retry button
    - Logs to console (no external error tracking)
  - Create `src/components/ErrorCard.tsx` — philosopher-specific error:
    - Shows "X está meditando em silêncio..." with philosopher name
    - Faded opacity, no retry (debate continues without this philosopher)
  - Implement rate limiting in middleware (simple in-memory counter per session):
    - Max 1 active debate per session
    - Returns 429 "Aguardem — os filósofos ainda estão debatendo" if second request
  - Add input validation edge cases:
    - Empty string → "Dilema não pode estar vazio"
    - Only whitespace → same error
    - >500 chars → "Dilema muito longo. Resuma em até 500 caracteres."
    - Special characters only → "Compartilhe um dilema real..."
  - Add streaming edge cases:
    - Client disconnects mid-stream → gracefully stop generation (AbortSignal)
    - Summary generation attempted before debate completes → 409 Conflict
  - Write tests for all edge cases
  - Create `src/components/Toast.tsx` — ephemeral notification for non-blocking messages

  **Must NOT do**:
  - Do NOT add Sentry/LogRocket/analytics
  - Do NOT implement retry logic for failed philosophers
  - Do NOT add rate limiting via external service (in-memory is enough for v1)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-cutting error handling across multiple components and API routes. Requires systematic edge case coverage.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 14, 15)
  - **Blocks**: Task 20
  - **Blocked By**: Task 12

  **References**:
  - React docs: `https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary` — Error boundaries
  - `src/app/api/debate/route.ts` (Task 12) — Route to add validation
  - `src/middleware.ts` (Task 7) — Middleware for rate limiting

  **Acceptance Criteria**:
  - [ ] Empty dilemma returns 400 with Portuguese error message
  - [ ] Second debate request during active debate returns 429
  - [ ] Philosopher failure shows error card, debate continues
  - [ ] Client disconnect stops stream generation
  - [ ] Summary request before debate complete returns 409
  - [ ] `bun test` passes: all edge case tests

  **QA Scenarios**:

  ```
  Scenario: Happy path — rate limiting
    Tool: Bash (curl)
    Preconditions: Active debate in progress (session X)
    Steps:
      1. curl -s -X POST http://localhost:3000/api/debate \
         -H "Content-Type: application/json" \
         -b "taberna-sid=session-X" \
         -d '{"dilemma": "Novo dilema"}' -w "\n%{http_code}"
      2. Assert HTTP status is 429
      3. Assert response contains "ainda estão debatendo"
    Expected Result: Rate limited with clear message
    Failure Indicators: 200 OK (debate started), wrong status code
    Evidence: .sisyphus/evidence/task-16-rate-limit.txt

  Scenario: Edge case — client disconnect
    Tool: Bash (curl)
    Preconditions: App running, mock streamText
    Steps:
      1. Start curl -N POST /api/debate in background
      2. Kill curl process after 2s (simulating tab close)
      3. Wait 5s
      4. Check server logs: no "write after end" errors
    Expected Result: Stream stops cleanly, no server errors
    Failure Indicators: Server crash, uncaught error in logs
    Evidence: .sisyphus/evidence/task-16-disconnect.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-16-rate-limit.txt`: Rate limiting response
  - [ ] `task-16-disconnect.txt`: Graceful disconnect verification

  **Commit**: YES
  - Message: `fix: add error handling for edge cases`
  - Files: `src/components/ErrorBoundary.tsx`, `src/components/ErrorCard.tsx`, `src/components/Toast.tsx`, `src/app/api/debate/route.ts`, `src/middleware.ts`

- [x] 17. Dockerfile (Multi-stage, Next.js Standalone)

  **What to do**:
  - Create `Dockerfile` with 3 stages (following Next.js standalone output pattern):
    - **Stage 1 (deps)**: `node:22-alpine` — copy package.json + bun.lock, `bun install --frozen-lockfile --production`
    - **Stage 2 (builder)**: `node:22-alpine` — copy deps + source, `bun run build` (generates `.next/standalone`)
    - **Stage 3 (runner)**: `node:22-alpine` — copy standalone output + static files + Prisma client, expose port 3000
  - Set `output: 'standalone'` in `next.config.ts` (enables standalone output for Docker)
  - Copy only production dependencies to runner
  - Include Prisma client generation in builder stage
  - Set `NODE_ENV=production` in runner
  - Add `.dockerignore`: node_modules, .next, .git, tests, docs, .env
  - Add health check: `HEALTHCHECK --interval=30s CMD node -e "require('http').get('http://localhost:3000/api/health', ...)"`
  - Create `docker-compose.yml` (dev only, not for production) with PostgreSQL + app
  - Verify: `docker build -t taberna .` succeeds
  - Verify: `docker run -p 3000:3000 taberna` starts and `/api/health` returns 200

  **Must NOT do**:
  - Do NOT include devDependencies in production image
  - Do NOT copy `.env` into Docker image (env vars passed at runtime)
  - Do NOT use `npm` or `yarn` — `bun` only (matching project setup)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-defined Dockerfile pattern for Next.js standalone. Follow docs exactly.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 18, 19, 20)
  - **Blocks**: Task 18
  - **Blocked By**: Task 14 (needs app to build)

  **References**:
  - Next.js docs: `https://nextjs.org/docs/app/building-your-application/deploying/docker` — Next.js Docker deployment guide with standalone output
  - Official docker docs: `https://docs.docker.com/reference/dockerfile/` — Dockerfile reference
  - `package.json` (Task 1) — Dependencies for bun install

  **Acceptance Criteria**:
  - [ ] `docker build -t taberna .` succeeds with exit code 0
  - [ ] `docker run --rm -p 3000:3000 -e DATABASE_URL=... taberna` starts and responds on :3000
  - [ ] `docker images taberna` shows image < 500MB (optimized)
  - [ ] No `.env` or credentials in image layers (`docker history taberna`)

  **QA Scenarios**:

  ```
  Scenario: Happy path — build and run Docker image
    Tool: Bash
    Preconditions: Docker daemon running
    Steps:
      1. docker build -t taberna-test . 2>&1 | tail -5
      2. Assert "Successfully tagged taberna-test" in output
      3. docker run --rm -d --name taberna-test -p 3001:3000 -e DATABASE_URL=postgres://... taberna-test
      4. sleep 5
      5. curl -s http://localhost:3001/api/health
      6. Assert status 200
      7. docker stop taberna-test
    Expected Result: Image builds, container runs, health check passes
    Failure Indicators: Build failure, container crash, health check 503
    Evidence: .sisyphus/evidence/task-17-docker-build.txt

  Scenario: Edge case — image size check
    Tool: Bash
    Preconditions: Image built
    Steps:
      1. docker images taberna-test --format "{{.Size}}" | sed 's/MB//'
      2. Assert numeric value < 500
    Expected Result: Image under 500MB
    Failure Indicators: Image > 500MB (likely includes devDependencies)
    Evidence: .sisyphus/evidence/task-17-image-size.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-17-docker-build.txt`: Build + run output
  - [ ] `task-17-image-size.txt`: Image size verification

  **Commit**: YES
  - Message: `feat: add Dockerfile for Next.js standalone`
  - Files: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `next.config.ts`

- [x] 18. k8s Manifests (Namespace, ConfigMap, Deployment, Service, Ingress, Kustomization)

  **What to do**:
  - Create `k8s/` directory with 5 files following `my-cluster` app-exemplo pattern:
    - **namespace.yaml**: `apiVersion: v1, kind: Namespace, name: taberna`
    - **configmap.yaml**: `PUBLIC_APP_URL=taberna.goriok.com`
    - **deployment.yaml**: replicas=1, strategy=RollingUpdate (safer than Recreate for Prisma), env from ConfigMap + Secrets, startupProbe (30s initial), livenessProbe (/api/health), readinessProbe (/api/health), port 3000, resource limits (request: 128Mi/100m, limit: 512Mi/500m), imagePullPolicy=Always
    - **service.yaml**: ClusterIP, port 80 → targetPort 3000
    - **ingress.yaml**: host=taberna.goriok.com, path=/, service=taberna:80
    - **kustomization.yaml**: resources list, namespace=taberna
  - Reference secrets via `secretKeyRef`: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`
  - Set `image: registry.registry.svc.cluster.local:5000/taberna:latest` (internal registry)
  - Create `Taskfile.yml` entry for deploy:
    - `task:build` — docker build + tag + push to internal registry
    - `task:deploy` — kubectl apply -k k8s/ + rollout restart
  - Write validation script: `kubectl apply --dry-run=client -k k8s/` must succeed
  - README section: how to create secrets on cluster

  **Must NOT do**:
  - Do NOT commit secret values (use placeholders in docs)
  - Do NOT use Helm or Terraform
  - Do NOT set replicas > 1 (single instance for now)
  - Do NOT add PVC (no persistent data in app — DB handles persistence)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Template-based YAML creation following well-documented patterns from my-cluster.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (wait for Dockerfile to validate image name)
  - **Parallel Group**: Wave 4 (with Tasks 17, 19, 20)
  - **Blocks**: Tasks 19, 20
  - **Blocked By**: Tasks 6, 17

  **References**:
  - `/Users/goriok/sources/my-cluster/k8s/apps/app-exemplo/` — **TEMPLATE**: namespace, deployment, service, ingress, kustomization
  - `/Users/goriok/sources/my-cluster/k8s/apps/distill-rss/deployment.yaml` — Deployment with internal registry image + probes
  - `/Users/goriok/sources/my-cluster/k8s/apps/vaultwarden/deployment.yaml` — Deployment with env from Secrets
  - `/Users/goriok/sources/my-cluster/k8s/apps/kustomization.yaml` — Must add `- taberna/` to resources

  **Acceptance Criteria**:
  - [ ] `kubectl apply --dry-run=client -k k8s/` succeeds with no errors
  - [ ] Ingress host is exactly `taberna.goriok.com`
  - [ ] Service port 80 maps to targetPort 3000
  - [ ] Deployment includes startupProbe, livenessProbe, readinessProbe all pointing to `/api/health`
  - [ ] Secrets referenced via `secretKeyRef` (not hardcoded values)

  **QA Scenarios**:

  ```
  Scenario: Happy path — k8s manifests validate
    Tool: Bash
    Preconditions: kubectl configured, k8s manifests written
    Steps:
      1. kubectl apply --dry-run=client -k k8s/ 2>&1
      2. Assert exit code 0
      3. Assert output contains "namespace/taberna created (dry run)"
      4. Assert output contains "deployment.apps/taberna created (dry run)"
      5. Assert output contains "service/taberna created (dry run)"
      6. Assert output contains "ingress.networking.k8s.io/taberna created (dry run)"
    Expected Result: All resources validate correctly
    Failure Indicators: YAML syntax error, missing resource, validation failure
    Evidence: .sisyphus/evidence/task-18-dry-run.txt

  Scenario: Edge case — ingress host check
    Tool: Bash
    Preconditions: k8s/ingress.yaml written
    Steps:
      1. grep "host:" k8s/ingress.yaml
      2. Assert output contains "taberna.goriok.com"
    Expected Result: Correct host name
    Failure Indicators: Wrong host, missing host field
    Evidence: .sisyphus/evidence/task-18-ingress-check.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-18-dry-run.txt`: Dry-run output
  - [ ] `task-18-ingress-check.txt`: Host verification

  **Commit**: YES
  - Message: `feat: add k8s manifests for deployment`
  - Files: `k8s/*.yaml`, `Taskfile.yml`, `README.md` (deploy section)

- [x] 19. Prisma Migration Job

  **What to do**:
  - Create `k8s/migration-job.yaml` — Kubernetes Job:
    - Uses same image as app (`registry.registry.svc.cluster.local:5000/taberna:latest`)
    - Command: `["bunx", "prisma", "migrate", "deploy"]`
    - env from same Secrets as deployment (DATABASE_URL)
    - `restartPolicy: OnFailure`
    - `backoffLimit: 3`
  - Update `k8s/kustomization.yaml` to include migration-job.yaml
  - Update `Taskfile.yml` deploy task to:
    1. Build + push image
    2. Run migration Job: `kubectl apply -f k8s/migration-job.yaml && kubectl wait --for=condition=complete job/taberna-migration --timeout=60s`
    3. Apply main manifests: `kubectl apply -k k8s/` (excluding job or with prune)
    4. Rollout restart deployment
  - Add pre-deploy check in Taskfile: `kubectl get job taberna-migration` to see last status
  - Write validation: `kubectl apply --dry-run=client -f k8s/migration-job.yaml` must succeed

  **Must NOT do**:
  - Do NOT run migration in init container (separate Job is safer for idempotency)
  - Do NOT auto-rollback on migration failure (fix forward)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Simple Kubernetes Job YAML + Taskfile update. Straightforward.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 17, 18, 20)
  - **Blocks**: None (final task in Wave 4)
  - **Blocked By**: Tasks 3, 18

  **References**:
  - k8s docs: `https://kubernetes.io/docs/concepts/workloads/controllers/job/` — Job resource
  - `k8s/deployment.yaml` (Task 18) — Same image reference for consistency
  - `prisma/schema.prisma` (Task 3) — Migration files to deploy

  **Acceptance Criteria**:
  - [ ] `kubectl apply --dry-run=client -f k8s/migration-job.yaml` succeeds
  - [ ] Job uses same image as deployment (not a separate image)
  - [ ] Job has `restartPolicy: OnFailure` and `backoffLimit: 3`
  - [ ] Taskfile deploy runs migration job BEFORE deploying main app
  - [ ] Migration job waits for completion before proceeding

  **QA Scenarios**:

  ```
  Scenario: Happy path — migration job YAML valid
    Tool: Bash
    Preconditions: kubectl configured, job YAML written
    Steps:
      1. kubectl apply --dry-run=client -f k8s/migration-job.yaml 2>&1
      2. Assert exit code 0
      3. Assert output contains "job.batch/taberna-migration created (dry run)"
    Expected Result: Job YAML valid
    Failure Indicators: YAML error, missing required fields
    Evidence: .sisyphus/evidence/task-19-migration-dry-run.txt

  Scenario: Edge case — Taskfile deploy sequence
    Tool: Bash
    Preconditions: Taskfile.yml with deploy task
    Steps:
      1. grep -A 10 "migration" Taskfile.yml
      2. Assert "kubectl apply -f k8s/migration-job.yaml" appears
      3. Assert "kubectl wait --for=condition=complete job/taberna-migration" appears after apply
      4. Assert "kubectl apply -k k8s/" appears AFTER migration wait
    Expected Result: Correct deploy ordering (migrate → deploy)
    Failure Indicators: Migration and deploy in wrong order, missing wait
    Evidence: .sisyphus/evidence/task-19-taskfile-order.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-19-migration-dry-run.txt`: Dry-run output
  - [ ] `task-19-taskfile-order.txt`: Taskfile deploy sequence

  **Commit**: YES
  - Message: `feat: add Prisma migration Job`
  - Files: `k8s/migration-job.yaml`, `k8s/kustomization.yaml`, `Taskfile.yml`

- [x] 20. Integration & E2E Tests

  **What to do**:
  - Create `tests/e2e/debate.spec.ts` — Playwright E2E tests:
    - **Full flow**: submit dilemma → wait for 7 cards → verify round 1 completes → verify intervention prompt → submit intervention → verify round 3 → verify summary appears
    - **Mobile**: run same flow at 375px viewport
    - **Error recovery**: simulate philosopher failure → verify error card → verify debate continues
    - **Input validation**: empty dilemma, too-long dilemma, special chars only
    - **Reset**: complete debate → click reset → verify clean state
    - **Accessibility**: run axe-core at each major state transition
  - Create `tests/integration/debate-api.test.ts` — API integration tests:
    - POST /api/debate → SSE stream structure verification
    - POST /api/summary → response format + DB persistence
    - Session cookie consistency across requests
    - Rate limiting (429 on concurrent requests)
  - Create test fixtures: mock philosopher responses for deterministic testing
  - Configure Playwright to use mocked API routes (not real LLM calls)
  - Add `bun run test:e2e` script to package.json
  - All tests must be deterministic (no real LLM calls, mocked streamText)

  **Must NOT do**:
  - Do NOT write tests that depend on real LLM API calls
  - Do NOT skip tests marked as flaky (all must be deterministic)
  - Do NOT test visual design quality (subjective) — test functional correctness

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive test suite across multiple layers (API integration + E2E). Requires systematic coverage of all flows and edge cases.
  - **Skills**: [`playwright`]
    - `playwright`: Essential for browser automation E2E tests with multiple viewports.
  - **Skills Evaluated but Omitted**:
    - `tdd`: Tests written after implementation (integration/E2E, not unit TDD)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 17, 18, 19)
  - **Blocks**: F1-F4 (Final Verification)
  - **Blocked By**: Tasks 12, 13, 14, 15, 16, 18

  **References**:
  - Playwright docs: `https://playwright.dev/docs/writing-tests` — Test writing guide
  - Playwright docs: `https://playwright.dev/docs/api/class-page` — Page API for assertions
  - `playwright.config.ts` (Task 1) — Base configuration
  - All previous task acceptance criteria — Test scenarios to automate

  **Acceptance Criteria**:
  - [ ] `bun run test:e2e` passes all Playwright tests (0 failures)
  - [ ] `bun test --run tests/integration/` passes all integration tests
  - [ ] Full debate flow test passes at both 1440px and 375px
  - [ ] Rate limiting test passes (429 verified)
  - [ ] axe-core accessibility audit passes

  **QA Scenarios**:

  ```
  Scenario: Happy path — complete E2E flow
    Tool: Playwright (via bun test:e2e)
    Preconditions: App running with mocked LLM, DB available
    Steps:
      1. Run: bun run test:e2e -- debate.spec.ts
      2. Assert all tests pass (0 failures)
      3. Assert "full debate flow" test passes
      4. Assert "mobile debate flow" test passes
      5. Assert "error recovery" test passes
    Expected Result: All E2E tests green
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-20-e2e-report.html

  Scenario: Integration — API contract verification
    Tool: Bash
    Preconditions: App running with mocked LLM
    Steps:
      1. bun test --run tests/integration/ --reporter verbose
      2. Assert "SSE stream structure" test passes
      3. Assert "summary persistence" test passes
      4. Assert "rate limiting" test passes
      5. Assert "session cookie consistency" test passes
    Expected Result: All integration tests pass
    Failure Indicators: Test failure, API contract mismatch
    Evidence: .sisyphus/evidence/task-20-integration-test.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-20-e2e-report.html`: Playwright HTML report
  - [ ] `task-20-integration-test.txt`: Integration test output

  **Commit**: YES
  - Message: `test: add integration and E2E tests`
  - Files: `tests/e2e/*.spec.ts`, `tests/integration/*.test.ts`, `tests/fixtures/*.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback → fix → re-run → present again → wait for okay.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | Evidence [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `bun test` + ESLint. Review all changed files for: `as any`/`@ts-ignore`, empty catches, `console.log` in prod code, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify Vercel AI SDK beta version pinned. Verify NO LangChain imports.
  
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Run full E2E suite. Test mobile viewport. Run accessibility audit. Save to `.sisyphus/evidence/final-qa/`.
  
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | A11y [N violations] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance per task. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes. Verify 7 philosophers exactly (no more, no less). Verify Cloudflare Access only (no in-app auth code).
  
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `chore: init Next.js project with Vitest, Tailwind, Prisma` — package.json, tsconfig.json, vitest.config.ts, tailwind.config.ts, prisma/schema.prisma
- **2**: `feat: add design system tokens and Tailwind config` — tailwind.config.ts, globals.css
- **3**: `feat: add Prisma schema for debates and summaries` — prisma/schema.prisma, prisma/migrations/
- **4**: `feat: add shared type definitions` — src/types/*.ts
- **5**: `feat: add 7 philosopher persona prompts` — src/philosophers/*.ts
- **6**: `feat: add health endpoint` — src/app/api/health/route.ts
- **7**: `feat: add anonymous session middleware` — src/lib/session.ts, src/middleware.ts
- **8**: `feat: add debate round manager` — src/lib/debate/round-manager.ts
- **9**: `feat: add context projection engine` — src/lib/debate/context-projection.ts
- **10**: `feat: add LLM provider setup with streaming` — src/lib/llm/provider.ts
- **11**: `feat: add philosopher card component` — src/components/PhilosopherCard.tsx
- **12**: `feat: add POST /api/debate route with 3-round flow` — src/app/api/debate/route.ts
- **13**: `feat: add POST /api/summary route for narrative generation` — src/app/api/summary/route.ts
- **14**: `feat: add main page with debate UI` — src/app/page.tsx, src/app/layout.tsx
- **15**: `feat: add mobile responsive layout` — src/app/page.tsx (responsive), globals.css
- **16**: `fix: add error handling for edge cases` — src/app/api/debate/route.ts, src/components/ErrorCard.tsx
- **17**: `feat: add Dockerfile for Next.js standalone` — Dockerfile
- **18**: `feat: add k8s manifests for deployment` — k8s/*.yaml
- **19**: `feat: add Prisma migration Job` — k8s/migration-job.yaml
- **20**: `test: add integration and E2E tests` — tests/integration/, tests/e2e/

---

## Success Criteria

### Verification Commands
```bash
bun run build          # Expected: compiled successfully
bun test               # Expected: all tests pass (N tests, 0 failures)
bun test --coverage    # Expected: >80% coverage
docker build -t taberna .  # Expected: image built
kubectl apply -k k8s/  # Expected: pod Ready
curl -I https://taberna.goriok.com  # Expected: HTTP/2 200
curl https://taberna.goriok.com/api/health  # Expected: {"status":"ok","db":"connected"}
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Deploy funcional em taberna.goriok.com
- [ ] 7 filósofos respondem em paralelo (rodada 1)
- [ ] 3 rodadas de debate completam
- [ ] Resumo narrativo gerado e persistido
- [ ] Mobile responsive funciona
- [ ] WCAG AA contraste passa
