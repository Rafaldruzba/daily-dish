```json
{
  "1": users (int, z dziennej bazy),
  "2": visits (int, sum views),
  "3": restaurants (int, aktywne),
  "4": reviews (int, opinie),
  "5": contactAttempts (int, z CRM),
  "6": status (str, "BistroMapa"),
  "ready": true,
  "version": "2026.09.17",
  "lastUpdate": "ISO"
}
```

ZAPYTANIE W WIDGECIE (1 endpoint, 6 miejsc):

```bash
$wg("https://your-domain/KWGTapi/widget?key=key", json, .data)
```

W TYCH 6 MIEJSCACH:

- 1 users = zarejestrowane konta
- 2 visits = sumowane odwiedziny
- 3 restaurants = liczba lokali
- 4 reviews = opinie
- 5 contactAttempts = próby kontaktu (0 + podłączenie CRM)
- 6 status = nazwa aplikacji
