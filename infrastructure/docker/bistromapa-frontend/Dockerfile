FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
# The lockfile omits @swc/helpers@0.5.23, an optional peer of the locked SWC binary.
RUN npm ci --legacy-peer-deps

COPY . .

# Next.js bakes public values and rewrites into the build output.
ARG BACKEND_API_URL=http://localhost:4001
ARG CRM_API_URL=http://localhost:4002
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_APP_URL=https://bistromapa.app
ARG NEXT_PUBLIC_GA_ID=
ARG NEXT_PUBLIC_MAIL=
ARG NEXT_PUBLIC_RECAPTCHA_PUBLIC=
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
ENV BACKEND_API_URL=${BACKEND_API_URL}
ENV CRM_API_URL=${CRM_API_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}
ENV NEXT_PUBLIC_MAIL=${NEXT_PUBLIC_MAIL}
ENV NEXT_PUBLIC_RECAPTCHA_PUBLIC=${NEXT_PUBLIC_RECAPTCHA_PUBLIC}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "start"]
