# Daily Dish monitoring Helm chart

Chart wdraża Prometheusa, Grafanę, Blackbox Exporter oraz exportery PostgreSQL
i Redis. Scrapuje aplikacje przez ich Kubernetes Services i używa istniejącego
Alertmanagera `alertmanager:9093` z chartu `daily-dish`. Dashboardy i reguły
alertów są kopiowane z `infrastructure/monitoring` do `files/` tego chartu.

## Przygotowanie Secretu Grafany

Utwórz Secret na podstawie lokalnego pliku (nie dodawaj pliku `.env` do Git):

```bash
kubectl create secret generic daily-dish-monitoring-secrets \
  --namespace daily-dish \
  --from-env-file=infrastructure/monitoring/.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

Secret aplikacji `daily-dish-secrets` musi już istnieć. Chart odczytuje z niego
tokeny metryk oraz użytkowników i hasła baz używane przez exportery. Adresy
baz z `sslmode=disable` są ustawione w `values.yaml`, bo lokalne Postgresy nie
mają włączonego SSL.

## Podgląd i instalacja

Z katalogu głównego repozytorium:

```bash
helm template daily-dish-monitoring infrastructure/helm/daily-dish-monitoring \
  --namespace daily-dish

helm upgrade --install daily-dish-monitoring \
  infrastructure/helm/daily-dish-monitoring \
  --namespace daily-dish
```

Obrazy bazowe są pobierane przez kind, jeśli nie ma ich na węźle. Prometheus i
Grafana dostają PVC. Usunięcie PVC może skasować zapisane dane i konfigurację
Grafany.

## Dostęp lokalny

```bash
kubectl port-forward -n daily-dish service/grafana 3002:3000
kubectl port-forward -n daily-dish service/prometheus 9090:9090
```

Grafana: `http://localhost:3002`; dane logowania pochodzą z Secretu
`daily-dish-monitoring-secrets`. Prometheus: `http://localhost:9090`.

Sprawdź targety Prometheusa pod `/targets`. Alerty i reguły są pod `/alerts`.
Alertmanager jest osobnym Service `alertmanager:9093`; do jego UI można
podłączyć port-forward:

```bash
kubectl port-forward -n daily-dish service/alertmanager 9093:9093
```

## Zakres

Chart zbiera metryki API, scrapera, backendu CRM, obu baz danych, Redis oraz
dostępności frontendów. cAdvisor z Docker Compose nie jest tu używany, bo jego
montowania hosta z Compose nie odwzorowują wprost węzłów kind.
