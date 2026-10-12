# Zawartość `public/`

Stan na 2026-10-12. Lista odpowiada temu, do czego faktycznie odwołuje się kod.

## Wymagane — kod się do nich odwołuje

| Plik | Gdzie używany | Uwagi |
|---|---|---|
| `bistro-logo.png` | nagłówek `(main)/layout.tsx`, stopka, preloader, ekran logowania, `app/layout.tsx` (JSON-LD `Organization.logo`) | obecnie ~213 KB, wyświetlany w rozmiarach 32–192 px |
| `favicon.svg` | `metadata.icons.icon` / `shortcut` + ikona w manifeście | obecnie 32×32, czarny kafelek z „B" |

## Dokumenty

| Plik | Uwagi |
|---|---|
| `regulamin.pdf` | linkowany z UI |
| `policy-privacy.pdf` | linkowany z UI |

## Generowane automatycznie przez Next — NIE wrzucaj do `public/`

Te pliki powstają z konwencji plikowych Next (`next/og`) i są serwowane pod własnymi adresami.
Trzymanie kopii w `public/` niczego nie nadpisze i grozi rozjazdem.

| Źródło | Adres publiczny | Co to jest |
|---|---|---|
| `app/icon.tsx` | `/icon` | 512×512 PNG — favicon i ikona w manifeście (także maskowalna) |
| `app/apple-icon.tsx` | `/apple-icon` | 180×180 PNG — `apple-touch-icon` |
| `app/opengraph-image.tsx` | `/opengraph-image` | 1200×630 — `og:image` i `twitter:image` |
| `app/manifest.ts` | `/manifest.webmanifest` | manifest PWA |
| `app/robots.ts` | `/robots.txt` | robots |
| `app/sitemap.ts` | `/sitemap.xml` | sitemap z hreflang pl/en |

## Czego NIE potrzebujesz (referencje usunięte)

| Plik | Dlaczego |
|---|---|
| `logo.png` | nie istniał; wszędzie używamy `bistro-logo.png` |
| `og-image.jpg` | nie istniał (OG prowadził do 404); teraz obraz generuje `app/opengraph-image.tsx` |
| `apple-touch-icon.png` | nie istniał; generuje go `app/apple-icon.tsx` |
| `site.webmanifest` | nigdy nie istniał, a layout wskazywał właśnie na niego; Next serwuje `/manifest.webmanifest` z `app/manifest.ts` |
| `favicon.ico` | nie istnieje i nie jest wymagany — jest `favicon.svg` + generowany PNG. Jedyny powód, żeby go dodać, to przeglądarki/crawlery zgrzytające na brak `/favicon.ico` (zwykły 404, bez wpływu na działanie) |

## Opcjonalne — jeśli chcesz własne grafiki zamiast generowanych

Podmiana jest lokalna: nadpisujesz plik źródłowy w `app/` albo wstawiasz własny plik do `public/`
i wskazujesz go w metadata.

| Plik do wstawienia | Rozmiar | Żeby zastąpić |
|---|---|---|
| `og-image.jpg` lub `.png` | 1200×630 | `app/opengraph-image.tsx` — dodaj `images` w `openGraph` w `app/[locale]/layout.tsx` |
| `apple-touch-icon.png` | 180×180 | `app/apple-icon.tsx` |
| `icon-192.png`, `icon-512.png` | 192×192, 512×512 | ikony w `app/manifest.ts` |
| `icon-maskable-512.png` | 512×512, treść w strefie bezpiecznej | ikona maskowalna w `app/manifest.ts` |

Uwaga do OG per-restauracja: `backgroundImageUrl` z API to **presigned S3 URL ważny 24 h**,
więc nie nadaje się na `og:image` (po dobie crawler dostaje 403). Dlatego profil restauracji
używa generowanego obrazu. Per-lokalowy OG wymaga publicznego URL-a zdjęcia.
