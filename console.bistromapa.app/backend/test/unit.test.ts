import type { ConfigService } from '@nestjs/config'

import { test, assert, section } from './harness'

import { addDays, startOfToday, startOfTomorrow } from '../src/common/dates'
import {
	CONSENT_STATUSES,
	CONTACT_TYPES,
	INTERACTION_TYPES,
	LEAD_SOURCES,
	LEAD_STATUSES,
	ONBOARDING_STATUSES,
} from '../src/common/domain.constants'
import { paginate } from '../src/common/dto/pagination.dto'
import { normalizeNip, normalizePhone, normalizeText, normalizeWebsite } from '../src/leads/dedup.service'
import { parseStatusList } from '../src/leads/dto/query-leads.dto'
import { bodyToHtml, renderTemplate } from '../src/email/email.service'
import { maskEmail } from '../src/activation/activation.service'
import { detectMapping, FIELD_LABELS, IMPORT_TARGET_FIELDS } from '../src/import/import.types'
import { MockLeadSourceProvider } from '../src/campaigns/providers/mock.provider'
import { IntegrationNotConfiguredError, BistroMapaApiClient } from '../src/integrations/bistromapa-api.client'
import { SESSION_COOKIE } from '../src/auth/auth.types'

// ────────────────────────────────────────────────────────────────────────────
section('Daty (common/dates)')

test('startOfToday — zeruje godziny', () => {
	const result = startOfToday(new Date('2026-09-17T14:35:12.456Z'))
	assert.equal(result.getHours(), 0)
	assert.equal(result.getMinutes(), 0)
	assert.equal(result.getSeconds(), 0)
	assert.equal(result.getMilliseconds(), 0)
})

test('startOfTomorrow — dokładnie dobę po początku dnia', () => {
	const now = new Date('2026-09-17T14:35:12')
	const today = startOfToday(now)
	const tomorrow = startOfTomorrow(now)

	assert.equal(tomorrow.getTime() - today.getTime(), 24 * 60 * 60 * 1000)
})

test('addDays — dodaje dni w przód', () => {
	const base = new Date('2026-09-17T10:00:00')
	assert.equal(addDays(base, 7).getDate(), 24)
})

test('addDays — cofa dni przy wartości ujemnej', () => {
	const base = new Date('2026-09-17T10:00:00')
	assert.equal(addDays(base, -1).getDate(), 16)
})

test('addDays — przechodzi przez granicę miesiąca', () => {
	const base = new Date('2026-09-30T10:00:00')
	const result = addDays(base, 1)
	assert.equal(result.getMonth(), 9, 'październik to miesiąc 9')
	assert.equal(result.getDate(), 1)
})

// ────────────────────────────────────────────────────────────────────────────
section('Stałe domenowe (common/domain.constants)')

test('CONTACT_TYPES — tylko PHONE/EMAIL/SMS liczą się jako próba kontaktu', () => {
	assert.deepEqual([...CONTACT_TYPES].sort(), ['EMAIL', 'PHONE', 'SMS'])
	assert.ok(!CONTACT_TYPES.includes('NOTE' as never), 'NOTE nie może być próbą kontaktu (readme §9)')
})

test('CONTACT_TYPES — każdy typ należy do INTERACTION_TYPES', () => {
	for (const type of CONTACT_TYPES) {
		assert.ok(INTERACTION_TYPES.includes(type), `${type} musi być w INTERACTION_TYPES`)
	}
})

test('statusy leada — komplet zgodny z readme §6', () => {
	assert.deepEqual(
		[...LEAD_STATUSES],
		['NEW', 'CONTACTED', 'NO_RESPONSE', 'CALL_BACK', 'INTERESTED', 'ACCEPTED', 'DECLINED'],
	)
})

test('statusy onboardingu — komplet zgodny z readme §7', () => {
	assert.deepEqual(
		[...ONBOARDING_STATUSES],
		['NOT_STARTED', 'CREATE_QUEUED', 'ACCOUNT_CREATED', 'INVITATION_SENT', 'ACTIVATED', 'ERROR'],
	)
})

test('źródła leadów — komplet zgodny z readme §22', () => {
	assert.deepEqual(
		[...LEAD_SOURCES],
		['GOOGLE_MAPS', 'WEBSITE', 'FACEBOOK', 'CSV', 'MANUAL', 'REFERRAL', 'OTHER'],
	)
})

test('zgody — GIVEN/DENIED/PENDING', () => {
	assert.deepEqual([...CONSENT_STATUSES], ['GIVEN', 'DENIED', 'PENDING'])
})

// ────────────────────────────────────────────────────────────────────────────
section('Paginacja (common/dto/pagination)')

test('paginate — liczy liczbę stron w górę', () => {
	const result = paginate([1, 2], 21, 1, 20)
	assert.equal(result.pages, 2)
	assert.equal(result.total, 21)
})

test('paginate — dokładna wielokrotność nie dodaje pustej strony', () => {
	assert.equal(paginate([], 40, 1, 20).pages, 2)
})

test('paginate — pusta lista ma co najmniej jedną stronę', () => {
	const result = paginate([], 0, 1, 20)
	assert.equal(result.pages, 1)
	assert.equal(result.total, 0)
})

test('paginate — przepisuje page i limit bez zmian', () => {
	const result = paginate(['a'], 100, 3, 50)
	assert.equal(result.page, 3)
	assert.equal(result.limit, 50)
})

// ────────────────────────────────────────────────────────────────────────────
section('Deduplikacja — normalizatory (leads/dedup.service)')

test('normalizePhone — usuwa spacje i myślniki', () => {
	assert.equal(normalizePhone('501 123 456'), '501123456')
	assert.equal(normalizePhone('501-123-456'), '501123456')
})

test('normalizePhone — zdejmuje kierunkowy 48 (readme §16)', () => {
	assert.equal(normalizePhone('+48 501 123 456'), '501123456')
	assert.equal(normalizePhone('48501123456'), '501123456')
})

test('normalizePhone — odrzuca zbyt krótkie numery', () => {
	assert.equal(normalizePhone('12345678'), null)
	assert.equal(normalizePhone('123'), null)
})

test('normalizePhone — pusta wartość daje null', () => {
	assert.equal(normalizePhone(null), null)
	assert.equal(normalizePhone(undefined), null)
	assert.equal(normalizePhone(''), null)
})

test('normalizeWebsite — zdejmuje protokół, www i ścieżkę', () => {
	assert.equal(normalizeWebsite('https://www.pizzaroma.pl/menu?x=1'), 'pizzaroma.pl')
	assert.equal(normalizeWebsite('http://pizzaroma.pl'), 'pizzaroma.pl')
})

test('normalizeWebsite — normalizuje wielkość liter', () => {
	assert.equal(normalizeWebsite('WWW.PizzaRoma.PL'), 'pizzaroma.pl')
})

test('normalizeWebsite — odrzuca wartość bez kropki', () => {
	assert.equal(normalizeWebsite('pizzaroma'), null)
	assert.equal(normalizeWebsite(null), null)
})

test('normalizeNip — usuwa separatory', () => {
	assert.equal(normalizeNip('123-456-32-18'), '1234563218')
	assert.equal(normalizeNip('123 456 32 18'), '1234563218')
})

test('normalizeNip — akceptuje wyłącznie 10 cyfr', () => {
	assert.equal(normalizeNip('12345'), null)
	assert.equal(normalizeNip('12345678901'), null)
	assert.equal(normalizeNip(null), null)
})

test('normalizeText — spacje, wielkość liter i interpunkcja', () => {
	assert.equal(normalizeText('  Pizza   Roma. '), 'pizza roma')
	assert.equal(normalizeText('Pizza, Roma'), 'pizza roma')
})

test('normalizeText — pusta wartość daje pusty string (nie null)', () => {
	assert.equal(normalizeText(null), '')
	assert.equal(normalizeText(undefined), '')
})

// ────────────────────────────────────────────────────────────────────────────
section('Filtry leadów (leads/dto/query-leads)')

test('parseStatusList — rozdziela po przecinku', () => {
	assert.deepEqual(parseStatusList('NEW,CONTACTED'), ['NEW', 'CONTACTED'])
})

test('parseStatusList — normalizuje wielkość liter i spacje', () => {
	assert.deepEqual(parseStatusList(' new , contacted '), ['NEW', 'CONTACTED'])
})

test('parseStatusList — odrzuca nieznane statusy', () => {
	assert.deepEqual(parseStatusList('NEW,BOGUS'), ['NEW'])
	assert.deepEqual(parseStatusList('BOGUS'), [])
})

test('parseStatusList — brak wartości daje pustą listę', () => {
	assert.deepEqual(parseStatusList(undefined), [])
	assert.deepEqual(parseStatusList(''), [])
})

// ────────────────────────────────────────────────────────────────────────────
section('Szablony emaili (email/email.service)')

test('renderTemplate — podstawia zmienne', () => {
	assert.equal(renderTemplate('Cześć {{name}}!', { name: 'Pizza Roma' }), 'Cześć Pizza Roma!')
})

test('renderTemplate — toleruje spacje w nawiasach', () => {
	assert.equal(renderTemplate('{{ name }}', { name: 'X' }), 'X')
})

test('renderTemplate — nieznana zmienna daje pusty string', () => {
	assert.equal(renderTemplate('A{{nope}}B', {}), 'AB')
})

test('renderTemplate — wartość null daje pusty string', () => {
	assert.equal(renderTemplate('[{{city}}]', { city: null }), '[]')
})

test('renderTemplate — podstawia wiele wystąpień tej samej zmiennej', () => {
	assert.equal(renderTemplate('{{a}}-{{a}}', { a: 'x' }), 'x-x')
})

test('renderTemplate — brak zmiennych zostawia treść bez zmian', () => {
	assert.equal(renderTemplate('Zwykły tekst', {}), 'Zwykły tekst')
})

test('bodyToHtml — zamienia nowe linie na <br>', () => {
	const html = bodyToHtml('linia1\nlinia2')
	assert.ok(html.includes('linia1<br>linia2'))
})

test('bodyToHtml — escapuje znaczniki HTML', () => {
	const html = bodyToHtml('<script>alert(1)</script>')
	assert.ok(!html.includes('<script>'), 'surowy <script> nie może przejść')
	assert.ok(html.includes('&lt;script&gt;'))
})

test('bodyToHtml — escapuje ampersand', () => {
	assert.ok(bodyToHtml('Kowalski & Syn').includes('&amp;'))
})

test('bodyToHtml — zamienia URL na klikalny link (link aktywacyjny, readme §24)', () => {
	const html = bodyToHtml('Kliknij https://bistromapa.app/auth/activate/abc123')
	assert.ok(html.includes('<a href="https://bistromapa.app/auth/activate/abc123"'))
})

test('bodyToHtml — opakowuje treść w kontener', () => {
	assert.ok(bodyToHtml('x').startsWith('<div'))
})

// ────────────────────────────────────────────────────────────────────────────
section('Aktywacja konta (activation/activation.service)')

test('maskEmail — zasłania lokalną część, zostawia domenę', () => {
	assert.equal(maskEmail('jan.kowalski@example.com'), 'j•••••••••••@example.com')
})

test('maskEmail — nie ujawnia pełnego adresu', () => {
	const masked = maskEmail('sekret@bistromapa.app')
	assert.ok(!masked.includes('sekret'), 'lokalna część nie może wyciekać w całości')
	assert.ok(masked.endsWith('@bistromapa.app'))
})

test('maskEmail — bardzo krótka część lokalna daje minimum 3 kropki', () => {
	assert.equal(maskEmail('a@b.pl'), 'a•••@b.pl')
})

test('maskEmail — wejście bez domeny zwracane bez zmian', () => {
	assert.equal(maskEmail('bezmalpy'), 'bezmalpy')
})

// ────────────────────────────────────────────────────────────────────────────
section('Import CSV/XLSX (import/import.types)')

test('IMPORT_TARGET_FIELDS — komplet pól docelowych', () => {
	assert.deepEqual(
		[...IMPORT_TARGET_FIELDS],
		['name', 'city', 'address', 'phone', 'email', 'website', 'nip', 'category', 'contactPerson', 'notes'],
	)
})

test('FIELD_LABELS — etykieta dla każdego pola docelowego', () => {
	for (const field of IMPORT_TARGET_FIELDS) {
		assert.ok(FIELD_LABELS[field], `brak etykiety dla ${field}`)
	}
})

test('detectMapping — rozpoznaje polskie nagłówki', () => {
	const mapping = detectMapping(['Nazwa restauracji', 'Miasto', 'Telefon', 'Email'])
	assert.equal(mapping.name, 'Nazwa restauracji')
	assert.equal(mapping.city, 'Miasto')
	assert.equal(mapping.phone, 'Telefon')
	assert.equal(mapping.email, 'Email')
})

test('detectMapping — rozpoznaje angielskie nagłówki', () => {
	const mapping = detectMapping(['name', 'city', 'phone', 'website'])
	assert.equal(mapping.name, 'name')
	assert.equal(mapping.city, 'city')
	assert.equal(mapping.phone, 'phone')
	assert.equal(mapping.website, 'website')
})

test('detectMapping — ignoruje wielkość liter i separatory', () => {
	const mapping = detectMapping(['NAZWA_RESTAURACJI', 'MIASTO'])
	assert.equal(mapping.name, 'NAZWA_RESTAURACJI')
	assert.equal(mapping.city, 'MIASTO')
})

test('detectMapping — nieznany nagłówek daje null', () => {
	const mapping = detectMapping(['kolumna_xyz'])
	assert.equal(mapping.name, null)
	assert.equal(mapping.email, null)
})

test('detectMapping — pusty nagłówek nie wywala mapowania', () => {
	const mapping = detectMapping([])
	for (const field of IMPORT_TARGET_FIELDS) {
		assert.equal(mapping[field], null)
	}
})

// ────────────────────────────────────────────────────────────────────────────
section('Profil mock źródła leadów (campaigns/providers)')

test('MockLeadSourceProvider — źródło to OTHER, nie GOOGLE_MAPS', async () => {
	const provider = new MockLeadSourceProvider()
	assert.equal(provider.source, 'OTHER', 'dane testowe nie mogą udawać Google (readme §19)')
})

test('MockLeadSourceProvider — jest skonfigurowany bez kluczy API', () => {
	assert.equal(new MockLeadSourceProvider().configured, true)
})

test('MockLeadSourceProvider — respektuje limit', async () => {
	const results = await new MockLeadSourceProvider().findLeads({ limit: 5 })
	assert.equal(results.length, 5)
})

test('MockLeadSourceProvider — nie przekracza wewnętrznego maksimum 20', async () => {
	const results = await new MockLeadSourceProvider().findLeads({ limit: 500 })
	assert.equal(results.length, 20)
})

test('MockLeadSourceProvider — każdy wynik ma nazwę i miasto', async () => {
	const results = await new MockLeadSourceProvider().findLeads({ city: 'Piaseczno', limit: 3 })
	for (const lead of results) {
		assert.ok(lead.name.length > 0)
		assert.equal(lead.city, 'Piaseczno')
	}
})

test('MockLeadSourceProvider — domyślne miasto to Warszawa', async () => {
	const results = await new MockLeadSourceProvider().findLeads({ limit: 1 })
	assert.equal(results[0].city, 'Warszawa')
})

// ────────────────────────────────────────────────────────────────────────────
section('Klient API BistroMapy (integrations)')

function configStub(values: Record<string, string>): ConfigService {
	return { get: (key: string) => values[key] } as unknown as ConfigService
}

test('BistroMapaApiClient — nieaktywny bez BISTRO_API_URL i tokenu', () => {
	const client = new BistroMapaApiClient(configStub({}))
	assert.equal(client.configured, false)
})

test('BistroMapaApiClient — nieaktywny, gdy brakuje samego tokenu', () => {
	const client = new BistroMapaApiClient(configStub({ BISTRO_API_URL: 'https://api.bistromapa.app/api' }))
	assert.equal(client.configured, false)
})

test('BistroMapaApiClient — aktywny przy komplecie konfiguracji', () => {
	const client = new BistroMapaApiClient(
		configStub({ BISTRO_API_URL: 'https://api.bistromapa.app/api', BISTRO_API_TOKEN: 'token' }),
	)
	assert.equal(client.configured, true)
})

test('BistroMapaApiClient — onboarding bez konfiguracji rzuca IntegrationNotConfiguredError', async () => {
	const client = new BistroMapaApiClient(configStub({}))
	await assert.rejects(
		() => client.createRestaurantWithOwner({ name: 'X', city: 'Y', email: 'a@b.pl' }),
		IntegrationNotConfiguredError,
	)
})

test('BistroMapaApiClient — aktywacja bez konfiguracji rzuca IntegrationNotConfiguredError', async () => {
	const client = new BistroMapaApiClient(configStub({}))
	await assert.rejects(() => client.activateUserAccount('user-1', 'haslo123456789'), IntegrationNotConfiguredError)
})

test('IntegrationNotConfiguredError — nazwa klasy pozwala odróżnić błąd konfiguracji', () => {
	const error = new IntegrationNotConfiguredError('brak konfiguracji')
	assert.equal(error.name, 'IntegrationNotConfiguredError')
	assert.ok(error instanceof Error)
})

// ────────────────────────────────────────────────────────────────────────────
section('Sesja CRM (auth/auth.types)')

test('SESSION_COOKIE — nazwa zgodna z middleware frontendu', () => {
	assert.equal(SESSION_COOKIE, 'crm_session', 'frontend/middleware.ts czyta dokładnie tę nazwę')
})
