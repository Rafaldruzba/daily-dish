# --- STAGE 1: Builder ---
FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build
RUN npm prune --omit=dev


# --- STAGE 2: Runner ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright

# Instalujemy narzędzia systemowe niezbędne do pobrania zależności przeglądarki
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Pobieramy Chromium dedykowane dla naszej wersji Playwright wraz z niezbędnymi zależnościami OS
RUN npx playwright install --with-deps chromium

EXPOSE 3001

CMD ["node", "dist/server.js"]
