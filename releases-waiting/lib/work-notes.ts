export type WorkStatus = 'in-progress' | 'done' | 'blocked'

export interface WorkNote {
	title: string
	description: string
	status: WorkStatus
	updatedAt: string
}

export const STATUS_LABEL: Record<WorkStatus, string> = {
	'in-progress': 'W toku',
	done: 'Gotowe',
	blocked: 'W planach',
}

export const STATUS_DOT: Record<WorkStatus, string> = {
	'in-progress': 'bg-amber-500',
	done: 'bg-emerald-600',
	blocked: 'bg-stone-400',
}

export const WORK_NOTES: WorkNote[] = [
	{
		title: 'SEO — lokalny marketing dla każdej zarejestrowanej restauracji',
		description:
			'Struktura aplikacji tworzona jest pod lokalne SEO w każdej miejscowości, w której są co najmniej 3 zarejestrowane restauracje. Staramy się, aby dla naszego KAŻDEGO klienta reklama powstawała sama.',
		status: 'in-progress',
		updatedAt: '2026-09-16',
	},
	{
		title: 'Interaktywna mapa i wyszukiwanie w okolicy',
		description:
			'Szybka, responsywna mapa pozwalająca gościom łatwo znaleźć Twój lokal na podstawie geolokalizacji, filtrując według typu kuchni, udogodnień i godzin otwarcia.',
		status: 'done',
		updatedAt: '2026-09-16',
	},
	{
		title: 'Dedykowana wizytówka i cyfrowe Menu',
		description:
			'Przejrzysty profil lokalu z opcją prezentacji pełnego menu, zdjęć dań, danych kontaktowych oraz bezpośrednim przekierowaniem do nawigacji Google Maps.',
		status: 'done',
		updatedAt: '2026-09-16',
	},
	{
		title: 'Moduł „Dania Dnia” i oferty lunchowe',
		description:
			'Możliwość szybkiej publikacji codziennego dania dnia na facebooku lub promocji ograniczonej czasowo, która od razu trafia na wyciągnięcie ręki użytkowników z okolicy.',
		status: 'in-progress',
		updatedAt: '2026-09-16',
	},
	{
		title: 'Bezpośredni kontakt bez prowizji',
		description:
			'Klienci klikający rezerwację lub telefon łączą się bezpośrednio z Twoim lokalem. Nie jesteśmy pośrednikiem.',
		status: 'done',
		updatedAt: '2026-09-16',
	},
	{
		title: 'Panel statystyk i widoczności lokalu',
		description:
			'Przejrzysty dashboard dla właściciela pokazujący liczbę odsłon wizytówki, kliknięć w numer telefonu oraz sprawdzeń trasy w wybranym okresie.',
		status: 'in-progress',
		updatedAt: '2026-09-16',
	},
	{
		title: 'Integracja z opiniami Google',
		description:
			'Automatyczne zaciąganie aktualnej oceny i opinii z Google Maps, aby Twoja dotychczasowa reputacja budowała zaufanie nowych gości również w naszej aplikacji.',
		status: 'blocked',
		updatedAt: '2026-09-16',
	},
]
