# Daily Dish Helm chart

Każda usługa ma osobny plik Deployment/StatefulSet i osobny Service w `templates/`.
`values.yaml` zawiera obrazy, porty i konfigurację lokalną. Sekrety są tworzone
poza chartem i przekazywane przez `daily-dish-secrets`.

## Przygotuj sekrety

W repozytorium jest lokalny plik `secrets.env` oraz bezpieczny szablon
`secrets.env.example`. Jeśli przygotowujesz własne środowisko, skopiuj szablon
do `secrets.env` i uzupełnij wartości. Następnie utwórz lub zaktualizuj Secret:

```bash
kubectl create namespace daily-dish --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic daily-dish-secrets \
  --namespace daily-dish \
  --from-env-file=infrastructure/helm/daily-dish/secrets.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

`DATABASE_URL` i `CRM_DATABASE_URL` muszą wskazywać na usługi `postgres`
i `postgres-crm`. Hasła oraz nazwy użytkowników muszą być zgodne z polami
`POSTGRES_*` i `CRM_POSTGRES_*` w tym samym pliku.

## Wdrożenie

Helm może utworzyć wszystkie zasoby z chartu jednym poleceniem. Najpierw
obejrzyj manifesty, żeby zobaczyć, co zostanie utworzone:

```bash
helm template daily-dish infrastructure/helm/daily-dish \
  --namespace daily-dish
```

Po utworzeniu Secretu i przygotowaniu obrazów aplikacji wdrożysz chart:

```bash
helm upgrade --install daily-dish infrastructure/helm/daily-dish \
  --namespace daily-dish --create-namespace
```

Do nauki polecam wdrożyć chart w ten sposób, a potem badać pojedyncze obiekty
przez `kubectl get`, `kubectl describe` i `kubectl logs`. Helm zapisuje release
i jego konfigurację; `kubectl` przyda Ci się do obserwowania i diagnozowania
zasobów. Ręczne tworzenie każdej usługi osobno też uczy, ale omija wtedy
praktykę pracy z Helm. `helm template` pozwala najpierw przejrzeć YAML bez
wdrażania czegokolwiek.

Przed instalacją zbuduj obrazy aplikacji zgodnie z instrukcją w
`infrastructure/docker/README.md` i załaduj je do klastra kind. `IfNotPresent`
sprawi, że Kubernetes użyje obrazu z węzła, a obrazy bazowe (Postgres, Redis,
Alertmanager) pobierze, jeśli nie ma ich jeszcze lokalnie.

Po utworzeniu Secretu i przygotowaniu obrazów uruchom `helm upgrade --install`
z poprzedniej sekcji, a potem obserwuj zasoby:

```bash
kubectl get pods,services,pvc -n daily-dish -w
```

Frontend BistroMapa ma Service typu `LoadBalancer`. Sprawdź przydzielony adres:

```bash
kubectl get service -n daily-dish bistromapa-frontend -w
```

Lokalny klaster musi mieć LoadBalancer provider. Dla minikube uruchom w osobnym
terminalu `minikube tunnel`; w innych klastrach skonfiguruj np. MetalLB.
Następnie otwórz `http://<EXTERNAL-IP>`.

Chart zawiera też Alertmanager pod wewnętrznym Service `alertmanager:9093`.
Prometheus z osobnego chartu `daily-dish-monitoring` wysyła do niego alerty.
Alertmanager wysyła powiadomienia do webhooka pod adresem z
`alertmanager.webhookUrl` w `values.yaml`. Domyślnie jest to
`host.docker.internal:9095`, więc adres może wymagać zmiany zależnie od klastra.
Sam serwer webhooka z `infrastructure/monitoring/alertmanager-webhook` nie jest wdrażany przez
ten chart; musi działać osobno i być osiągalny z klastra.

Pełny monitoring (Prometheus, Grafana, exporters i dashboardy) ma osobny chart
w `infrastructure/helm/daily-dish-monitoring`.

Panel CRM pozostaje wewnętrzny. Oba frontendowe kontenery mogą nasłuchiwać na
porcie `3000`, bo działają w osobnych Podach. Porty lokalne wybierasz w
`kubectl port-forward`; poniżej BistroMapa jest dostępna na `localhost:3001`,
a CRM na `localhost:3000`. Uruchom polecenia w osobnych terminalach:

```bash
kubectl port-forward -n daily-dish service/bistromapa-frontend 3001:80
kubectl port-forward -n daily-dish service/console-frontend 3000:3000
```

Otwórz `http://localhost:3001` dla BistroMapy lub `http://localhost:3000` dla
CRM. Bazy i Redis również nie są wystawione poza klaster. PVC przechowują dane
lokalne; ich usunięcie może skasować bazy.

## Struktura

```text
daily-dish/
├── Chart.yaml
├── values.yaml
├── secrets.env.example
└── templates/
    ├── api-configmap.yaml
    ├── api-deployment.yaml
    ├── api-service.yaml
    ├── scrapper-deployment.yaml
    ├── scrapper-service.yaml
    ├── console-backend-configmap.yaml
    ├── console-backend-deployment.yaml
    ├── console-backend-service.yaml
    ├── bistromapa-frontend-deployment.yaml
    ├── bistromapa-frontend-service.yaml
    ├── console-frontend-deployment.yaml
    ├── console-frontend-service.yaml
    ├── postgres-statefulset.yaml
    ├── postgres-service.yaml
    ├── postgres-crm-statefulset.yaml
    ├── postgres-crm-service.yaml
    ├── redis-statefulset.yaml
    ├── redis-service.yaml
    ├── alertmanager-configmap.yaml
    ├── alertmanager-deployment.yaml
    └── alertmanager-service.yaml
```

To chart do lokalnej nauki, nie konfiguracja produkcyjna. Nie zawiera Ingressa
ani pełnego stosu monitoringu. Żeby zmienić image tag lub liczbę replik, użyj
`--set` albo podaj własny plik values przez `-f`.
