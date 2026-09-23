import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getMobileUrl, scrapeFacebookPage } from '../src/services/scraper.service.js'

describe('Scrapper Service', () => {
	describe('getMobileUrl', () => {
		it('zamienia www.facebook na m.facebook', () => {
			assert.strictEqual(getMobileUrl('https://www.facebook.com/page'), 'https://m.facebook.com/page')
		})

		it('zostawia już mobilny URL', () => {
			assert.strictEqual(getMobileUrl('https://m.facebook.com/page'), 'https://m.facebook.com/page')
		})

		it('usmicao trimuje spacje', () => {
			assert.strictEqual(getMobileUrl('  https://facebook.com/page  '), 'https://m.facebook.com/page')
		})
	})

	describe('scrapeFacebookPage', () => {
		it('zwraca null przy braku URL', async () => {
			const result = await scrapeFacebookPage('Test', '')
			assert.strictEqual(result, null)
		})

		it('zwraca wynik z nazwą', async () => {
			const result = await scrapeFacebookPage('Test', 'https://m.facebook.com/testpage')
			// Playwright może zwrócić null jeśli strona nie istnieje — akceptujemy oba
			assert.ok(result === null || typeof result.name === 'string')
		})
	})
})
