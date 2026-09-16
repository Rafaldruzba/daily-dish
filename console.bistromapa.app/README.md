# BistroMapa Console — CRM do pozyskiwania restauracji

Wewnętrzny panel (Next.js + NestJS + PostgreSQL) do zarządzania potencjalnymi restauracjami.
Specyfikacja: [`docs/readme.md`](docs/readme.md). Wymagania techniczne i zasady: [`../CLAUDE.md`](../CLAUDE.md).

---

## Jak uruchomić

### 1. Baza danych (jednorazowo)

Baza `crm_console` na lokalnym PostgreSQL **jeszcze nie istnieje** — `prisma migrate dev` utworzy ją razem z tabelami.

```bash
cd backend
npx prisma generate
npx prisma migrate dev        # utworzy bazę crm_console i zastosuje migrację 20260916210000_init_crm
npx prisma db seed            # konto admina + domyślne szablony emaili
```

Seed wymaga w `backend/.env`:

```env
ADMIN_EMAIL=twoj@email.pl
ADMIN_PASSWORD=minimum-12-znakow
```

### 2. Backend

```bash
cd backend
npm install
npm run dev        # http://localhost:3002/api
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Frontend gada z API przez własny origin (`/api/*` → rewrite w `next.config.ts`), więc ciasteczko sesji jest first-party.
Domyślny adres API to `http://localhost:3002/api`; zmienisz go przez `API_URL` w `frontend/.env.local`.

---

## Zmienne środowiskowe backendu

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DATABASE_URL` | tak | połączenie do bazy CRM (osobna baza — nie `daily_dish`) |
| `JWT_SECRET` | tak | **min. 32 znaki** — start bez tego się nie powiedzie |
| `FRONTEND_URL` | tak | origin frontendu (CORS + ciasteczko) |
| `PORT` | nie | domyślnie `3002` |
| `JWT_EXPIRES_IN` | nie | domyślnie `12h` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | tylko seed | konto administratora |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | dla maili | bez tego wysyłka zwraca błąd (nigdy cichego sukcesu) |
| `LEAD_SOURCE_PROVIDER` | nie | `mock` (domyślnie) lub `google` |
| `GOOGLE_MAPS_API_KEY` | dla Google | oficjalne Places API, klucz wyłącznie w backendzie |
| `BISTRO_API_URL`, `BISTRO_API_TOKEN` | dla onboardingu | **TODO** — główny backend nie ma jeszcze endpointu CRM |

Wzór: [`backend/.env.example`](backend/.env.example).

> ⚠️ Obecny `JWT_SECRET` w `backend/.env` ma 21 znaków. Backend celowo nie wstanie z takim sekretem —
> podmień go na losowe 32+ znaków (`openssl rand -base64 48`).

---

## Co jest zrobione

### Etap 0 — Fundament
- [x] `tsconfig.json`, `nest-cli.json`, skrypty `dev`/`build`/`seed` (`tsx`/`ts-node` → standardowy toolchain Nest, bo esbuild nie emituje `design:paramtypes` i DI NestJS nie działało)
- [x] `ConfigModule` + walidacja env przy starcie (`src/config/env.validation.ts`)
- [x] `PrismaModule`/`PrismaService` (Prisma 7 + `@prisma/adapter-pg`, wzorzec z `bistromapa.api`)
- [x] `ValidationPipe`, filtr wyjątków, interceptor `{ success, data }`, wspólna paginacja
- [x] `prisma/seed.ts` — admin z env + 4 domyślne szablony emaili
- [x] `main.ts` — CORS dla `FRONTEND_URL`, cookie-parser, prefiks `/api`, port z env
- [x] **Naprawa schematu**: `Lead.campaignJobs` nie miał przeciwnej strony relacji → schemat nigdy się nie walidował

### Etap 1 — Auth
- [x] Logowanie e-mail + hasło (bcrypt), JWT w **httpOnly cookie**, `GET /auth/me`, `POST /auth/logout`, zmiana hasła
- [x] Prawdziwy `JwtAuthGuard` (weryfikacja podpisu) jako **globalny** guard + `@Public()` dla logowania
- [x] `RolesGuard` + `@Roles('ADMIN')`, `@CurrentUser()`
- [x] `AuditService` — `LOGIN`, `LOGIN_FAILED`, `STATUS_CHANGED`, `CONSENT_UPDATED`, `LEAD_MERGED`, `IMPORT_*`…
- [x] Rate limiting: 10 prób logowania / min, 300 żądań / min globalnie

> Poprzedni `auth.guard.ts` przepuszczał **każdy** nagłówek `Authorization` — usunięty.

### Etap 2 — Leady, kontakty, follow-upy
- [x] `GET /leads` — paginacja, szukanie, filtry (status/miasto/kategoria/źródło/zakres kontaktu/follow-up), sortowanie
- [x] `GET /leads/:id`, `POST /leads`, `PUT /leads/:id`, `PUT /leads/:id/status`, `PUT /leads/:id/consent`, `DELETE /leads/:id`
- [x] `POST /leads/:id/merge` — scalanie duplikatu (historia i follow-upy przechodzą na leada docelowego)
- [x] Deduplikacja `nip → email → telefon → strona → nazwa+miasto` z normalizacją; **409 z listą kandydatów**, zapis tylko po decyzji użytkownika
- [x] `InteractionsService` — historia tylko dopisywana, kontakt liczy `contactAttempts` i `lastContactAt`
- [x] `FollowUpsService` — terminy, zamykanie, synchronizacja `Lead.nextFollowUpAt`
- [x] `GET /stats` — dashboard na realnych zapytaniach (już nie hardkodowane liczby)
- [x] Zgody jako osobne pola (status/źródło/data/notatka)

### Etap 3 — Frontend (wcześniej: brak `package.json`, puste pliki)
- [x] Scaffold: Next 15, React 19, Tailwind v4, `lucide-react`, `postcss`, `middleware.ts`
- [x] Layout + sidebar (Dashboard/Leady/Kampanie/Import/Automatyzacja/Emaile/Ustawienia), responsywny
- [x] `lib/api.ts` (jeden klient, na serwerze forwarduje ciasteczko), `lib/format.ts` (deterministyczne daty — bez rozjazdu hydracji), `types/`
- [x] `/login` + `middleware` przekierowujący niezalogowanych
- [x] `/` dashboard: statystyki, follow-upy dzisiaj/zaległe, ostatnie leady, ostatnie kontakty
- [x] `/leads` tabela z filtrami, sortowaniem, paginacją, inline zmianą statusu, `tel:`/`mailto:`
- [x] `/leads/new` formularz + sprawdzanie duplikatów i wybór „Pomiń / Dodaj mimo wszystko / Scal”
- [x] `/leads/[id]` — widok szczegółów podpięty do API (był na `SAMPLE_LEAD`), historia, zgody, follow-up, onboarding, scalanie
- [x] `/settings` + zmiana hasła

### Etap 4 — Import CSV/XLSX
- [x] `POST /import/preview` — parsowanie, detekcja kolumn, mapowanie, walidacja, duplikaty, podgląd (wiersze trzymane serwerowo pod `importId`, nie latają przez przeglądarkę)
- [x] `POST /import/commit` — zapis **dopiero po potwierdzeniu**, domyślnie pomija duplikaty
- [x] `/import` — kreator krok po kroku

### Etap 5 — Kampanie i źródło leadów
- [x] `LeadSourceProvider` (interfejs wymienny, §19) + `MockLeadSourceProvider` + `GoogleMapsProvider` (oficjalne Places API, bez scrapowania HTML)
- [x] `CampaignsService` — kampania → zadania (miasto), uruchamianie zadaniowe, wznawianie, liczniki, retry
- [x] `/campaigns`, `/campaigns/new`, `/campaigns/[id]` z akcjami na zadaniach

### Etap 6 — Email, automatyzacja, onboarding
- [x] Modele `EmailTemplate`, `EmailLog`, `AutomationLog` + pola ponowień na `Lead`
- [x] `EmailService` (nodemailer + SMTP), szablony z bazy, renderowanie `{{zmiennych}}`, logi, wpis w historii kontaktów
- [x] `BistroMapaApiClient` — realny klient HTTP; **endpoint onboardingu oznaczony `TODO`** (główny backend go nie ma), więc wywołanie kończy się kontrolowanym błędem, nie fałszywym sukcesem
- [x] Worker: cron o 00:00 + ręczne uruchomienie; przejścia idempotentne, `onboardingStatus`, `retryCount`, `lastError`, `lastAttemptAt`
- [x] `/automation` — status integracji, liczniki, logi z ponowieniem
- [x] `/settings/emails` — edycja szablonów + historia wysyłek

---

## Co zostaje

- [ ] **Uruchomić migrację i seed** (sekcja „Jak uruchomić” wyżej) — bez tego panel nie ma danych
- [ ] Podmienić `JWT_SECRET` na 32+ znaków
- [ ] Smoke test end-to-end na działającej bazie: logowanie → dodanie leada → kontakt → follow-up → import → kampania
- [ ] Integracja onboardingu — **po stronie głównego backendu** trzeba dodać `POST /admin/crm/onboarding`
      (zwraca `restaurantId`, `userId`). Potem wystarczy uzupełnić `BISTRO_API_URL`/`BISTRO_API_TOKEN`.
- [ ] Automatyczne wykrywanie `ACTIVATED` — teraz jest ręczne oznaczanie (`POST /automation/:leadId/activate`),
      bo wymaga zapytania do API BistroMapy
- [ ] `GOOGLE_MAPS_API_KEY` — bez klucza kampanie działają tylko na źródle `mock`

---

## Zasady, których się trzymamy

- CRM ma **własną bazę** (`crm_console`) i nie jest drugą bazą restauracji — po onboardingu pamięta tylko `bistroRestaurantId`/`bistroUserId`.
- Nic nie zapisuje się bez decyzji użytkownika, gdy wykryty jest duplikat.
- Sekrety wyłącznie w backendzie; frontend nie zna kluczy API.
- Brakujące integracje są oznaczone `TODO` i kończą się błędem — **żadnych atrap udających sukces**.
