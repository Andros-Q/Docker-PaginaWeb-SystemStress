# Etapa 1: Dependencias
FROM docker.io/library/node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Etapa 2: Constructor
FROM docker.io/library/node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Etapa 3: Ejecutor (Runner)
FROM docker.io/library/node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Aquí está el truco: Next.js guarda el server.js dentro de .next/standalone/
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
