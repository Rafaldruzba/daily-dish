import 'reflect-metadata'

import { runAll } from './harness'

// Importy rejestrują kroki (na poziomie modułu), runAll() je wykonuje.
import './unit.test'
import './http.test'

async function main(): Promise<void> {
	await runAll()
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
