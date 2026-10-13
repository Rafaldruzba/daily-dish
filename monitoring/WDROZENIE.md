# Wdrożenie Prometheus + Grafana - Status

## ✅ Ukończone

### 1. Backend główny (bistromapa.api - port 4001)
- ✅ Metryki HTTP: `lib/metrics.ts` (middleware, error handler, endpoint `/metrics`)
- ✅ Metryki użytkowników: `lib/metrics-users.ts` (liczba użytkowników, aktywni, rejestracje, logowania)
- ✅ Integracja w `app.ts`:
  - Middleware `metricsMiddleware` - przed routerami
  - Endpoint `GET /metrics` dla Prometheus
  - Globalny error handler z metryką `unhandledErrors`
- ✅ Metryki w `routes/auth.ts`:
  - `registrations.inc()` - przy rejestracji
  - `logins.inc({ result: 'success' })` - przy udanym logowaniu
  - `logins.inc({ result: 'failure' })` - przy nieudanym logowaniu

### 2. Scraper (bistromapa.scrapper - port 4003)
- ✅ Metryki HTTP: `lib/metrics.ts`
- ✅ Metryki scrappera: `lib/metrics-scraper.ts` (joby, czas trwania, liczba elementów)
- ✅ Integracja w `server.ts`:
  - Middleware `metricsMiddleware`
  - Endpoint `GET /metrics`
  - Globalny error handler

### 3. Console Backend (console.bistromapa.app/backend - port 4002)
- ✅ Metryki HTTP: `lib/metrics.ts`
- ✅ Integracja w `main.ts` (NestJS):
  - Middleware `metricsMiddleware`
  - Endpoint `GET /api/metrics` (z prefixem `/api`)

### 4. Monitoring Stack (Docker Compose)
- ✅ Prometheus (port 9090) - zbiera metryki
- ✅ Grafana (port 3002) - wizualizacja
- ✅ Blackbox Exporter (port 9115) - probe frontendów
- ✅ Postgres Exporter (port 9187) - metryki PostgreSQL (main)
- ✅ Postgres Exporter CRM (port 9188) - metryki PostgreSQL (CRM)
- ✅ Redis Exporter (port 9121) - metryki Redis
- ✅ cAdvisor (port 8081) - metryki kontenerów Docker

### 5. Konfiguracja Prometheus
- ✅ Poprawione porty w `prometheus.yml`:
  - backend: 4001
  - scraper: 4003
  - backend-console: 4002 (ścieżka `/api/metrics`)
- ✅ Konfiguracja przeładowana

### 6. Dashboardy i Alerty
- ✅ Dashboard aplikacji: `app-overview.json` (error rate, req/s, latency, top endpointy, użytkownicy, CPU/RAM)
- ✅ Dashboard infrastruktury: `infrastructure.json` (dostępność, Postgres x2, Redis, kontenery)
- ✅ Alerty: `prometheus/rules/alerts.yml`
- ✅ Automatyczne ładowanie do folderu "Daily Dish" w Grafanie

## 📋 Pozostałe kroki (wymagane do pełnego działania)

### 1. Uruchom backendy lokalnie
Aby metryki zaczęły działać, uruchom wszystkie backendy:

```bash
# Backend główny (port 4001)
cd bistromapa.api
npm run dev

# Scraper (port 4003)
cd bistromapa.scrapper
npm run dev

# Console backend (port 4002)
cd console.bistromapa.app/backend
npm run dev
```

### 2. Dodaj metryki scrappera do `scraper.service.ts`
W pliku `bistromapa.scrapper/src/services/scraper.service.ts` dodaj instrumentację:

```typescript
import { scraperJobs, scraperJobDuration, scraperItems } from '../lib/metrics-scraper.js'

// W funkcji scrapeBatch:
export async function scrapeBatch(restaurants: Restaurant[]) {
  const end = scraperJobDuration.startTimer()
  try {
    // ... istniejący kod ...
    
    scraperJobs.inc({ status: 'success' })
    scraperItems.inc(totalDishes) // gdzie totalDishes to liczba zescrapowanych dań
    
    return results
  } catch (error) {
    scraperJobs.inc({ status: 'failure' })
    throw error
  } finally {
    end()
  }
}
```

### 3. Dodaj śledzenie aktywnych użytkowników (opcjonalne)
W middleware auth (`bistromapa.api/src/middleware/auth.ts`):

```typescript
import { trackActiveUser } from '../lib/metrics-users.js'

// W middleware authenticate, po weryfikacji tokena:
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // ... istniejący kod weryfikacji JWT ...
  
  if (decoded?.id) {
    trackActiveUser(decoded.id) // śledź aktywnego użytkownika
  }
  
  next()
}
```

### 4. Ustaw METRICS_TOKEN (opcjonalne, dla produkcji)
Aby zabezpieczyć endpoint `/metrics`:

```bash
# W .env dla każdego backendu:
METRICS_TOKEN=twoj-tajny-token-tutaj
```

Prometheus będzie musiał wysyłać ten token w nagłówku `Authorization: Bearer <token>`.

## 🔍 Weryfikacja

### Sprawdź endpoint `/metrics`
```bash
# Backend główny
curl http://localhost:4001/metrics

# Scraper
curl http://localhost:4003/metrics

# Console backend
curl http://localhost:4002/api/metrics
```

### Sprawdź targety w Prometheus
http://localhost:9090/targets

Wszystkie targety powinny być w stanie **UP** (zielone).

### Otwórz Grafanę
http://localhost:3002 (admin / admin)

Dashboardy w folderze **Daily Dish**:
- **Aplikacje** - metryki backendów
- **Infrastruktura** - metryki baz danych i kontenerów

## 📊 Metryki dostępne

### Backend główny i Console
- `http_request_duration_seconds` - czas obsługi requestów (histogram)
- `http_requests_in_flight` - liczba requestów w trakcie (gauge)
- `app_unhandled_errors_total` - nieobsłużone błędy (counter)
- `app_users_total` - liczba użytkowników (gauge)
- `app_active_users` - aktywni użytkownicy (ostatnie 5 min, gauge)
- `app_user_registrations_total` - liczba rejestracji (counter)
- `app_user_logins_total` - liczba logowań (counter, label: result=success|failure)
- Domyślne metryki Node.js (CPU, RAM, event loop, GC)

### Scraper
- `http_request_duration_seconds` - czas obsługi requestów
- `http_requests_in_flight` - liczba requestów w trakcie
- `app_unhandled_errors_total` - nieobsłużone błędy
- `scraper_jobs_total` - liczba jobów (counter, label: status=success|failure)
- `scraper_job_duration_seconds` - czas trwania jobu (histogram)
- `scraper_items_total` - liczba zescrapowanych elementów (counter)
- Domyślne metryki Node.js

## 🚀 Deployment na Railway

Gdy będziesz wdrażać na Railway:

1. **Zmień adresy w `prometheus.yml`**:
   ```yaml
   # Zamiast host.docker.internal użyj prywatnych adresów Railway:
   - targets: ['backend.railway.internal:4001']
   - targets: ['scraper.railway.internal:4003']
   - targets: ['backend-console.railway.internal:4002']
   ```

2. **Zabezpiecz `/metrics`**:
   - Ustaw `METRICS_TOKEN` w zmiennych środowiskowych
   - Dodaj w Prometheus config:
     ```yaml
     scrape_configs:
       - job_name: backend
         authorization:
           credentials: <METRICS_TOKEN>
     ```

3. **Prometheus i Grafana jako osobne serwisy**:
   - Stwórz Dockerfile dla Prometheus z `prometheus.yml`
   - Dodaj Volume dla danych Prometheus
   - Grafana z Volume dla dashboardów

4. **Pomiń na Railway**:
   - cAdvisor (Railway ma własne metryki kontenerów)
   - Exportery hosta

## 📝 Notatki

- Wszystkie nazwy metryk i labele **muszą** zgadzać się z dashboardami Grafany
- Redis cache dla aktywnych użytkowników wykorzystuje sorted set `metrics:active_users`
- Metryki nie powinny crashować aplikacji - wszystkie błędy są silent fail
- Dashboard "Aplikacje" będzie pusty dopóki backendy nie będą odpalone
