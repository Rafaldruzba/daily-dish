# --- STAGE 1: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

# Instalacja wszystkich zależności (w tym devDependencies potrzebnych do budowania)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generowanie klienta Prismy oraz kompilacja projektu
COPY . .
RUN npx prisma generate
RUN npm run build

# Odchudzenie node_modules do samych paczek produkcyjnych (zamiast ponownego npm ci w runnerze)
RUN npm prune --omit=dev

# --- STAGE 2: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Kopiowanie gotowych artefaktów z etapu builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Automatyczna migracja i start aplikacji
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]