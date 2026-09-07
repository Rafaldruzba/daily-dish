===ZROBIONE===  przy usuwaniu Restauracji przez admina oraz przez ownera (czyli w dwóch miejscach) dodać zabezpieczenie w postaci popupu z miejscem do przepisania nazwy + 6 cyfer, jesli wpisana fraza jest równa tej wymaganej dopiero wtedy pozwolić na usunięcie - w tym moemencie jest tylko marny popup przeglądarkowy
===ZROBIONE===  
===ZROBIONE===  Usuwanie konta tak samo!
===ZROBIONE===  
===ZROBIONE===  przycisk zapomniałem hasła który wysyla link resetujący z tokenem na maila, ładna strona z miejscami na ustawienie nowego hasła
===ZROBIONE===  
===ZROBIONE===  strona 404 - notfound
===ZROBIONE===  
===ZROBIONE===  obsługa przenoszenia na strone główną jeśli ktoś zbłądzi
===ZROBIONE===  
===ZROBIONE===  
===ZROBIONE===  ========================
===ZROBIONE===  
===ZROBIONE===  pamiętanie zakładek, np dodanie do url miejsca w ktorym jestesmy tak abyśmy po odswiezeniu strony byli w tym samym miejscu
===ZROBIONE===  
===ZROBIONE===  zakładki:
===ZROBIONE===  
===ZROBIONE===  w profilu: lokale i statysytyki - sprawdzanie po / (czyli storna główna)
===ZROBIONE===  w profilu: zgłoś nową restauracje - sprawdzanie po ?tab=new
===ZROBIONE===  w profilu: subskrybcje - sprawdzanie po ?tab=sub
===ZROBIONE===  w profilu: historia płatności - sprawdzanie po ?tab=payments
===ZROBIONE===  w profilu: ustawienia konta - sprawdzanie po ?tab=settings
===ZROBIONE===  
===ZROBIONE===  strona główna: Oferty dnia - sprawdzanie po /
===ZROBIONE===  strona główna: Oferty dnia + Ulubione sprawdzanie po ?tab=favourites
===ZROBIONE===  strona główna: Ranking Główny - sprawdzanie po ?tab=ranking + dodać strony
===ZROBIONE===  
===ZROBIONE===  RestaurantDetailPage.tsx: Oferta dnia - sprawdzanie po ?tab=daily-offer
===ZROBIONE===  RestaurantDetailPage.tsx: Opinie - sprawdzanie po ?tab=opinions
===ZROBIONE===  RestaurantDetailPage.tsx: O nas - sprawdzanie po ?tab=about-us
===ZROBIONE===  RestaurantDetailPage.tsx: Menu Ogólne - sprawdzanie po ?tab=menu
===ZROBIONE===  
===ZROBIONE===  =========================
===ZROBIONE===  
===ZROBIONE===  Katalog - RestaurantsPage.tsx - zabezpieczyć ładowanie wyników do 10 na strone, dodać w url ?page= numer strony, na dole dodać mini karuzele z numerami strony jeśli jest ich dużo zrobić: 1, 2, 3, ... , 100
===ZROBIONE===  
===ZROBIONE===  Katalog - sprawdzić z storagea albo z innego źródła jaką ustawił miejscowość użytkownik i na samej górze pokazywać restauracje w jego okolicy, dopiero pozniej reszte albo w momencie wyszukiwania
===ZROBIONE===  
===ZROBIONE===  =======================
===ZROBIONE===  
===ZROBIONE===  POST /api/offers/:restaurantId/standard-offer >> zmienić frontend, oddzielić stałą pozycję od formularza edycji, i dodać go w zakładce Oferta dnia
===ZROBIONE===  naprawić problem z tym zwiazany otóż w jsonie z zapytania są takie dane
===ZROBIONE===  "staticOfferTitle": null,
===ZROBIONE===  "staticOfferDesc": null,
===ZROBIONE===  "staticOfferPrice": null,
===ZROBIONE===  "staticOfferImg": null,
===ZROBIONE===  pomimo wpisania
===ZROBIONE===  
===ZROBIONE===  W zakładce Menu ogólne przy dodawaniu pozycji menu dodac jakąś logikę która pobiera już aktywne już kategorie i pozwala wybrać je z rozwijanej listy
===ZROBIONE===  W zakładce menu ogólne zmienić frontend - dania mają być rozciągnięte na całą strone czyli bez siatki gdzie są 2 kolumny, oraz mają być posortowane kategoriami
===ZROBIONE===  
===ZROBIONE===  Dodać przycisk udostępnij - dla wszystkich (nawet niezalogowanych)

===========Płatności============

zmienić płatności!
Ja zrobiłbym:

🍽️ BASE — 100 zł/mies.

Wszystko, czego restauracja potrzebuje do obecności w BistroMapie:

profil restauracji,
danie dnia z Facebooka,
stała oferta na stronie głównej,
stałe menu,
zdjęcia, opis itd.
🚀 PROMOTION — +50 zł/mies.

Jedyny dodatek:

większa widoczność,
pierwszeństwo przed zwykłymi wynikami w promieniu 30 km.

Czyli klient widzi bardzo prosty komunikat:

BistroMapa BASE — 100 zł/mies.
Wszystko, żeby Twoja restauracja była widoczna w BistroMapie.

+ PROMOTION — 50 zł/mies.
Wypromuj swoją restaurację wyżej w wynikach.

To moim zdaniem będzie dużo łatwiejsze do sprzedania.

Dodatkowo nie obniżałbym STATIC_MENU do np. 20–30 zł, bo wtedy masz kolejny mikroprodukt, który komplikuje ofertę bardziej niż daje Ci pieniędzy.

I jeszcze jedna rzecz: 100 zł/mies. brzmi rozsądniej psychologicznie niż 100 + 50 + 50. Restaurator ma poczucie, że płaci 100 zł za cały podstawowy system, a 50 zł jest tylko za faktyczną reklamę.

Trial zostawiłbym dokładnie tak jak masz — 1–3 miesiące BASE za darmo, bez PROMOTION. To jest bardzo dobry sposób, żeby restauracja mogła zobaczyć, czy BistroMapa faktycznie przynosi jej ruch.

============nie ruszać===========

podpiąć bucket z railwaya który będzie przechowywał zdjęcia z codziennie pobieranych zdjęć (logika w scrapperze), oraz zdjęcia pozycji stałych, w przyszłości również zdjęcie profilowe oraz tło

Region auto
BUCKET_URL
BUCKET_NAME
ACCESS_KEY_ID
SECRET_ACCESS_KEY
npm install @aws-sdk/client-s3

=======================

zmiana nodemailera na resend |
RESEND_API
