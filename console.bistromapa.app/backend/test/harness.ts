// Musi być pierwsze: dekoratory NestJS/class-validator (@Type, @IsInt) wołają
// Reflect.getMetadata, a polyfill nie ładuje się sam poza bootstrapem aplikacji.
import 'reflect-metadata'

import assert from 'node:assert/strict'

/**
 * Minimalny harness testowy — bez frameworka (CLAUDE.md §8: bez zbędnych zależności).
 * Po każdym udanym kroku wypisuje "<nazwa>: OK ✅", a na końcu podsumowanie.
 * Kod wyjścia 1, jeśli cokolwiek poległo.
 */

const registered: { name: string; fn: () => unknown | Promise<unknown> }[] = []
const failures: { name: string; reason: string }[] = []

let passed = 0
let skipped = 0

/** Rzucone z kroku, gdy brakuje warunku środowiskowego — krok liczy się jako pominięty, nie jako błąd. */
export class Skip extends Error {
	constructor(reason: string) {
		super(reason)
		this.name = 'Skip'
	}
}

/** Rejestruje krok testowy. Wywoływane na poziomie modułu, przed `runAll()`. */
export function test(name: string, fn: () => unknown | Promise<unknown>): void {
	registered.push({ name, fn })
}

/** Krok świadomie pominięty — brak warunku środowiskowego (np. serwer nie działa). */
export function skip(name: string, reason: string): void {
	skipped++
	console.log(`${name}: POMINIĘTO ⏭  (${reason})`)
}

export async function runAll(): Promise<void> {
	for (const { name, fn } of registered) {
		try {
			await fn()
			passed++
			console.log(`${name}: OK ✅`)
		} catch (error) {
			if (error instanceof Skip) {
				skipped++
				console.log(`${name}: POMINIĘTO ⏭  (${error.message})`)
				continue
			}

			const reason = error instanceof Error ? error.message : String(error)
			failures.push({ name, reason })
			console.log(`${name}: FAIL ❌ — ${reason}`)
		}
	}

	console.log('')
	console.log('─'.repeat(64))
	console.log(`Wynik: ${passed} OK ✅   ${failures.length} FAIL ❌   ${skipped} pominięto ⏭`)

	if (failures.length > 0) {
		console.log('')
		console.log('Niepowodzenia:')
		for (const failure of failures) {
			console.log(`  ✗ ${failure.name}`)
			console.log(`    ${failure.reason}`)
		}
		process.exitCode = 1
	}
}

/** Sekcja nagłówkowa — porządkuje długą listę kroków. */
export function section(title: string): void {
	console.log('')
	console.log(`### ${title}`)
}

export { assert }
