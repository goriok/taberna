# Stage 1: Install production dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache bash curl && \
  curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build the application
FROM node:22-alpine AS builder
COPY --from=deps /root/.bun/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun x prisma generate && bun run build

# Stage 3: Migrator — lean image with only what prisma migrate deploy needs
FROM node:22-alpine AS migrator
COPY --from=deps /root/.bun/bin/bun /usr/local/bin/bun
ENV PATH="/usr/local/bin:$PATH"
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
CMD ["bun", "x", "prisma", "migrate", "deploy"]

# Stage 4: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy public assets (favicons, etc.)
COPY --from=builder /app/public ./public

# Copy standalone output (includes compiled server + pruned node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets for CDN-independent serving
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
