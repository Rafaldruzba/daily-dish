# --- STAGE 1: Builder ---
FROM node:22-slim AS builder
WORKDIR /app

# Prisma wymaga OpenSSL
RUN apt-get update && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .

# ZŁOTY ŚRODEK: Podstawiamy atrapę bazy TYLKO na etap budowania.
# Dzięki temu prisma.config.ts czyta poprawnego stringa i pozwala wygenerować klienta.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

RUN npm run build
RUN npm prune --omit=dev


# --- STAGE 2: Runner ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL w środowisku docelowym
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
# Kopiujemy konfig Prismy 7 do runnera!
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Tutaj atrapa nie istnieje. Railway podstawia prawdziwy DATABASE_URL,
# migracja czyta konfigurację z prisma.config.ts i rusza.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]