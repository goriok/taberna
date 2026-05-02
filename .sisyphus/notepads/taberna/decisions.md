# Taberna Decisions

## Architecture
- JS over Python (Vercel AI SDK native subagents/streaming)
- SSE over WebSockets (simpler, unidirectional)
- Prisma over Drizzle (more mature, auto migrations)
- httpOnly cookies for sessions (NOT sessionStorage — SSR incompatible)
- 7 hardcoded philosopher personas (no DB, no factory/base class)
- Server-side orchestration (API routes manage debate, client is thin UI)
- Cloudflare Access only (no in-app auth)
- Narrative summary persists, full conversations do NOT
- RollingUpdate deployment strategy
- Prisma migration via Kubernetes Job (not init container)

## Visual
- Bohemian Parisian: bottle-green, cream, copper, amber, art nouveau
- Playfair Display (headings) + Inter (body)
- CSS-only decorations (no images)
- No dark/light mode toggle

## LLM
- Claude Sonnet 4.5 for philosophers (depth)
- GPT-4o-mini for AI selector + summary generation
- Vercel AI SDK v6 pinned to beta.128