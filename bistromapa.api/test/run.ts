import { runAll } from './harness.js'

// Importy rejestrują kroki (na poziomie modułu), runAll() je wykonuje.
import './unit.test.js'
import './http.test.js'

async function main(): Promise<void> {
	await runAll()
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
