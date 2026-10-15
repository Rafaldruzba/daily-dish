# Dockerfiles

Dockerfiles są zebrane tutaj, a kontekst budowania pozostaje katalogiem danej usługi.
Uruchamiaj poniższe polecenia z katalogu głównego projektu `daily-dish`.

| Usługa | Dockerfile | Kontekst budowania |
|---|---|---|
| API | `infrastructure/docker/bistromapa.api/Dockerfile` | `bistromapa.api` |
| Scraper | `infrastructure/docker/bistromapa.scrapper/Dockerfile` | `bistromapa.scrapper` |
| Backend CRM | `infrastructure/docker/console-backend/Dockerfile` | `console.bistromapa.app/backend` |
| Frontend BistroMapa | `infrastructure/docker/bistromapa-frontend/Dockerfile` | `bistromapa.app` |
| Frontend CRM | `infrastructure/docker/console-frontend/Dockerfile` | `console.bistromapa.app/frontend` |
| Prometheus | `infrastructure/docker/monitoring/Dockerfile.prometheus` | `infrastructure/monitoring` |
| Grafana | `infrastructure/docker/monitoring/Dockerfile.grafana` | `infrastructure/monitoring` |
| Alertmanager | `infrastructure/docker/monitoring/Dockerfile.alertmanager` | `infrastructure/monitoring` |
| Postgres Exporter | `infrastructure/docker/monitoring/Dockerfile.postgres-exporter` | `infrastructure/monitoring` |
| Redis Exporter | `infrastructure/docker/monitoring/Dockerfile.redis-exporter` | `infrastructure/monitoring` |

Przykład budowania API:

```bash
docker build -f infrastructure/docker/bistromapa.api/Dockerfile -t daily-dish-api:local bistromapa.api
docker build -f infrastructure/docker/bistromapa.scrapper/Dockerfile -t daily-dish-scraper:local bistromapa.scrapper
docker build -f infrastructure/docker/console-backend/Dockerfile -t console-backend:local console.bistromapa.app/backend
```

Frontendy wymagają przekazania adresów backendów jako `--build-arg`, ponieważ
Next.js zapisuje konfigurację rewrites w wyniku budowania. Frontend CRM używa
`API_URL` również przy żądaniach wykonywanych po stronie serwera, dlatego jego
Dockerfile ustawia tę wartość także w obrazie uruchomieniowym. Dla lokalnego
Helm charta użyj nazw Service `daily-dish-api` i `console-backend`:

```bash
docker build -f infrastructure/docker/bistromapa-frontend/Dockerfile \
  --build-arg BACKEND_API_URL=http://daily-dish-api:4001 \
  --build-arg CRM_API_URL=http://console-backend:4002 \
  -t bistromapa-frontend:local bistromapa.app

docker build -f infrastructure/docker/console-frontend/Dockerfile \
  --build-arg API_URL=http://console-backend:4002/api \
  -t console-frontend:local console.bistromapa.app/frontend
```

Przeniesienie Dockerfile nie zmienia kontekstu. Ścieżki `COPY` w każdym obrazie
liczą się względem kontekstu budowania, nie katalogu, w którym leży Dockerfile.
