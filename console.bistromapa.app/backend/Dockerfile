# --- STAGE 1: Builder ---
FROM node:22-slim AS builder
WORKDIR /app

# Prisma wymaga OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

# Atrap bazy tylko na czas generowania klienta Prisma — prawdziwy URL podstawia Railway
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev


# --- STAGE 2: Runner ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist ./dist

EXPOSE 3002

# 1. migrate deploy — aplikuje pending migracje bez pytania (bezpieczne na produkcji)
# 2. seed — idempotentny: tworzy admina i szablony maili tylko, jeśli ich brakuje
#    (istniejącego admina nie nadpisuje — hasło mogło zostać zmienione w panelu)
# 3. start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js"]
