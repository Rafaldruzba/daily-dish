-- Normalizacja citySlug dla rekordów zaktualizowanych poprzednią migracją.
-- Poprzedni UPDATE używał jedynie LOWER/REPLACE, przez co polskie znaki zostały
-- w slugach (np. "łochów" zamiast "lochow"), co psuło adresy URL i dopasowanie w API.
UPDATE "Restaurant"
SET "citySlug" = TRIM(
	BOTH '-' FROM REGEXP_REPLACE(
		LOWER(TRANSLATE("city", 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ')),
		'[^a-z0-9]+',
		'-',
		'g'
	)
);
