/** Małe litery, bez polskich znaków – do porównywania tekstów. */
export const stripDiacritics = (s: string) =>
	s
		.toLocaleLowerCase('pl-PL')
		.replace(/ł/g, 'l') // ł nie rozkłada się przez NFD
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')

/** Data w strefie Warszawy, format YYYY-MM-DD. */
export const warsawDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(d)
