# Draft: Taberna — Encontro de Filósofos

## Visão Geral
App web onde múltiplos filósofos (personas de IA) discutem fatos/dilemas que o usuário traz do dia-a-dia.
Estética: boêmia, limpa (clean), temática de taverna filosófica.

## Requisitos Confirmados
- **Inspiração estrutural**: `/Users/goriok/sources/cantinho` (arquitetura, padrões)
- **Deploy**: `/Users/goriok/sources/my-cluster` como `taberna.goriok.com`
- **Host + Autenticação**: Já prontos no cluster
- **Tema visual**: Boêmio, clean, taverna
- **Temática**: Filosofia — múltiplos filósofos discutindo

## Referência Filosófica (doc do usuário)
O documento aborda:
- Praxis pessoal concreta (Heidegger, Nietzsche, Schopenhauer, Camus, Han, Kosík)
- Neurodivergência como praxis ontológica diferente
- Logos como resignificação, não supressão
- O artífice como praxis ontologicamente congruente (Sennett)
- Analogia do rio (sedimentação de praxis)

### Filósofos mencionados no doc:
- **Heidegger** — autenticidade, Dasein, ser-para-a-morte, Stimmung
- **Nietzsche** — amor fati, "assim eu quis", vontade de potência
- **Schopenhauer** — valor intrínseco do ser, crítica à opinião externa
- **Camus** — absurdo, Sísifo feliz, qualidade técnica
- **Byung-Chul Han** — morte sistêmica estrutural, sociedade do cansaço
- **Kosík** — praxis histórica e coletiva
- **Sartre** — má-fé, projeto de vida (mencionado indiretamente)
- **Sennett** — o artífice, conhecimento tácito

## Decisões Confirmadas
- **Modelo de conversa**: Debate simultâneo — filósofos respondem em paralelo, depois podem réplicas
- **Filósofos**: Começar com os 7 do doc (Heidegger, Nietzsche, Schopenhauer, Camus, Han, Kosík, Sennett), com possibilidade de adicionar/remover depois
- **Persistência**: Conceito "taberna" — um resumo/ata do fim da sessão persiste, mas não as conversas inteiras anteriores (como um livro de visitas ou "conclusões da noite")
- **Testes**: TDD (RED-GREEN-REFACTOR)

## Pesquisa: Arquitetura do Cantinho (projeto de referência)
- **Stack**: Python 3.12 + FastAPI + LangChain/LangGraph + SQLModel + PostgreSQL
- **Frontend**: Vanilla HTML/CSS/JS (sem React/Next.js, sem build step)
- **LLM**: Provider-agnostic via `init_chat_model()` — troca provider com 1 env var
- **Prompt**: Armazenado como diretivas no DB (SQLModel), compilado dinamicamente
- **Conversa**: LangGraph StateGraph + Postgres checkpointer (histórico completo)
- **Streaming**: SSE via `sse-starlette` + `astream_events()`
- **Auth**: Nenhuma no app — Cloudflare Access no edge
- **Deploy**: Docker 2-stage → push para registry interno → kubectl apply -k k8s/

## Pesquisa: Infraestrutura do Cluster (my-cluster)
- **Plataforma**: k3s single-node (Contabo VPS)
- **Ingress**: Traefik v3
- **Acesso externo**: Cloudflare Tunnel (wildcard `*.goriok.com` → Traefik)
- **SSL**: Cloudflare Edge (automático)
- **Auth**: Cloudflare Access (Zero Trust dashboard, por subdomínio)
- **Padrão novo app**: namespace.yaml + deployment.yaml + service.yaml + ingress.yaml + kustomization.yaml + DNS CNAME
- **Secrets**: kubectl create secret (nunca commitados)

## Pesquisa: Padrões Multi-Agente & AI SDKs
- **Melhor arquitetura multi-agente**: AI Selector (orquestrador decide turnos) + Peer-to-Peer
- **Melhor SDK para multi-agente**: Vercel AI SDK v6 (subagents nativos, streaming, React hooks)
- **Cantinho usa LangChain** — mais pesado, mas familiar. Vercel AI SDK é mais moderno e leve.
- **Persona engineering**: Structured template + Egocentric Context Projection (SPASM paper)
- **UI multi-persona**: Slack-style conversation rows com avatares, cores, badges, filtros
- **OSS inspirador**: moltbot-philosopher (10 filósofos, conselho com votação), chatsparty (AI selector)

## ✅ Decisão Arquitetural: JavaScript + Vercel AI SDK
**Stack confirmado**: Next.js 15 (App Router) + Vercel AI SDK v6 + React 19 + Tailwind CSS
**Racional**: Subagents nativos para multi-filósofo, streaming paralelo built-in, React hooks prontos.

## ✅ Estética Visual: Boêmia Parisiense
- **Inspiração**: Café intelectual parisiense, absinto, art nouveau
- **Paleta**: Verde-garrafa (#1a3c2a), creme (#f5f0e8), cobre (#b87333), âmbar (#c77d20)
- **Tipografia**: Serifada para títulos (Playfair Display), sans-serif para corpo (Inter)
- **Elementos**: Ícones de absinto/pena/vela, texturas de papel envelhecido, cantos arredondados

## ✅ Persistência: Resumo Narrativo
- Ao fim de cada sessão, um parágrafo literário é gerado e salvo
- Estilo: "Na noite de 01 de maio, sob a luz âmbar da Taberna, Heidegger e Nietzsche..."
- Conversas completas NÃO persistem (efêmeras como uma noite de taverna)

## ✅ Testes: TDD
- Framework: Vitest (nativo do ecossistema JS moderno)
- Testes unitários + integração antes da implementação
- Agent-executed QA scenarios em todas as tasks

## Decisões Técnicas (confirmadas)
- [x] Stack: JavaScript/TypeScript + Next.js 15 + Vercel AI SDK v6
- [x] UI: React 19 + Tailwind CSS + Framer Motion
- [x] DB: PostgreSQL (compartilhado com cluster)
- [x] ORM: a definir (Prisma vs Drizzle vs Kysely)
- [x] Deploy: Docker + k8s (padrão my-cluster)
- [x] Auth: Cloudflare Access no edge

## ✅ Fluxo do Debate: 3 Rodadas com Intervenção
1. Usuário submete dilema/fato do dia
2. **Rodada 1** — Todos os 7 filósofos respondem em paralelo (streaming simultâneo)
3. Cada filósofo "vê" as respostas dos outros (contexto compartilhado)
4. **Rodada 2** — Réplicas: cada um refina/contesta com base no que os outros disseram
5. Usuário pode intervir (comentar, perguntar, direcionar)
6. **Rodada 3** — Tréplicas finais com a intervenção do usuário
7. Geração do resumo narrativo ("ata da noite")

## ✅ ORM: Prisma
- Migrations automáticas, type-safe, maduro no ecossistema Next.js
- Modelos: Session, Summary, Philosopher (configuração de persona)

## ✅ Auth: Cloudflare Access apenas
- Sem contas de usuário no app
- Sessão anônima (sessionStorage, como cantinho)
- Proteção no edge (Cloudflare Zero Trust)

## ✅ Responsivo: Sim (mobile-first)
- A taverna funciona em qualquer dispositivo
- Layout adaptativo: sidebar colapsa em mobile, cartas de filósofo empilham

## ✅ AI Provider: Anthropic Claude (default)
- Claude Sonnet 4.5 para os filósofos (profundidade filosófica)
- Modelo mais leve para o orquestrador de turnos (GPT-4o-mini ou Haiku)

## Scope Boundaries (Final)
**IN**:
- App web com UI taverna boêmia parisiense
- 7 personas filosóficas fixas (expansível)
- Debate de 3 rodadas com intervenção do usuário
- Streaming paralelo na rodada 1
- Resumo narrativo persistente ao fim da sessão
- Deploy no cluster como taberna.goriok.com
- TDD com Vitest + agent-executed QA
- Mobile responsive

**EXCLUDE**:
- Chat com filósofo único
- Voz/áudio/TTS
- RAG em corpus filosófico
- Multi-idioma (só pt-BR inicialmente)
- Contas de usuário no app
- Histórico completo de conversas
- Upload de arquivos/imagens
- Compartilhamento social

## Scope Boundaries
- **IN**: App web, UI taverna, 7 personas filosóficas, debate paralelo, resumo persistente, deploy no cluster
- **EXCLUDE**: Chat com filósofo único, voz/áudio, RAG em corpus filosófico, multi-idioma
