# Monitoring (Prometheus + Grafana)

## Start

```bash
cd monitoring
cp .env.example .env      # dane do baz - takie jak w głównym docker-compose
docker compose up -d
```

| Usługa | URL |
|---|---|
| **Grafana** (admin / admin) | http://localhost:3002 |
| Prometheus | http://localhost:9090 (targety: `/targets`, alerty: `/alerts`) |
| cAdvisor | http://localhost:8081 |

Grafana jest na **3002**, bo 3000 i 3001 zajmują frontendy.
Dashboardy ładują się automatycznie do folderu **Daily Dish**:

- **Aplikacje**: error rate, req/s, latency p50/p95/p99, kody odpowiedzi, top endpointy, użytkownicy, CPU/RAM/event loop, scraper
- **Infrastruktura**: dostępność wszystkiego, Postgres (x2), Redis, kontenery Docker, probe frontendów

## Instrumentacja backendów (wymagane - bez tego dashboard aplikacji będzie pusty)

```bash
npm i prom-client
```

1. Skopiuj `instrumentation/metrics.ts` do **backend (4001)**, **backend-console (4003)** i **scraper (4002)**.
2. W `app.ts`:
   ```ts
   app.use(metricsMiddleware);        // przed routerami
   app.get('/metrics', metricsHandler);
   ```
3. `metrics-users.ts` -> backend i backend-console. Uzupełnij `countUsers()`, `countActiveUsers()`
   i wołaj `registrations.inc()` / `logins.inc({ result })` w odpowiednich miejscach.
4. `metrics-scraper.ts` -> scraper (joby, czas jobu, liczba elementów).

Nazwy metryk muszą zostać takie jak w plikach, bo na nich oparte są dashboardy i alerty.
Przy NestJS/Fastify zachowaj nazwę `http_request_duration_seconds` i labele `method`, `route`, `status_code`.

## Frontendy (3000 / 3001)

Prometheus nie scrapuje frontendów, tylko sprawdza ich dostępność i czas odpowiedzi (blackbox exporter).
Błędy z przeglądarki i Web Vitals to osobny temat (np. Sentry / Grafana Faro).

## Railway

- Lokalne porty (`host.docker.internal:4001`) zamień w `prometheus/prometheus.yml` na adresy
  prywatnej sieci Railway, np. `backend.railway.internal:PORT`.
- Prometheus i Grafanę wdróż jako osobne serwisy (Dockerfile z `prometheus.yml`) i dodaj **Volume** na dane.
- Zabezpiecz `/metrics`: ustaw `METRICS_TOKEN` w aplikacji, a w Prometheusie w jobie dodaj
  `authorization: { credentials: <token> }`. Nie wystawiaj `/metrics` publicznie.
- Pominąć na Railway: cAdvisor i exportery hosta (tam metryki infrastruktury dostajesz z panelu Railway).

## Typowe problemy

- **Target DOWN dla backend/scraper** -> aplikacja nie ma jeszcze `/metrics` albo nie nasłuchuje na `0.0.0.0`/`localhost` dostępnym z Dockera.
- **Brak danych z cAdvisor** (Docker Desktop) -> usuń serwis `cadvisor` i panel "Kontenery", reszta działa bez niego.
- **Zmiana configu Prometheusa** -> `curl -X POST http://localhost:9090/-/reload`.
