import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const DEFAULT_TEMPLATES = [
	{
		key: 'first-contact',
		name: 'Pierwszy kontakt',
		subject: 'BistroMapa — restauracja {{name}} w {{city}}',
		body: 'Dzień dobry,\n\nzauważyliśmy, że {{name}} nie jest jeszcze widoczna w BistroMapie. Chętnie opowiemy, jak działamy i co to daje lokalom w {{city}}.\n\nCzy znajdzie Pan/Pani chwilę na krótką rozmowę?\n\nPozdrawiamy\nZespół BistroMapy',
	},
	{
		key: 'offer',
		name: 'Oferta BistroMapy',
		subject: 'Oferta dla {{name}} — obecność w BistroMapie',
		body: 'Dzień dobry,\n\nw załączeniu przesyłamy informacje o BistroMapie: profil restauracji, menu dnia, zdjęcia i opinie gości.\n\nPodstawowy profil jest bezpłatny — płatne są tylko rozszerzenia promocyjne.\n\nChętnie odpowiemy na pytania.\n\nPozdrawiamy\nZespół BistroMapy',
	},
	{
		key: 'follow-up',
		name: 'Follow-up',
		subject: 'Przypomnienie — BistroMapa i {{name}}',
		body: 'Dzień dobry,\n\nwracamy do naszej rozmowy o profilu {{name}} w BistroMapie. Czy udało się zapoznać z informacjami?\n\nJeśli woli Pan/Pani porozmawiać telefonicznie, jesteśmy do dyspozycji.\n\nPozdrawiamy\nZespół BistroMapy',
	},
	{
		key: 'invitation',
		name: 'Zaproszenie do BistroMapy',
		subject: 'Zaproszenie do BistroMapy — aktywuj konto {{name}}',
		body: 'Dzień dobry,\n\nkonto dla {{name}} zostało utworzone. Aby je aktywować i ustawić własne hasło, kliknij poniższy link:\n\n{{activationUrl}}\n\nZe względów bezpieczeństwa nie przesyłamy haseł emailem.\n\nPozdrawiamy\nZespół BistroMapy',
	},
]

/**
 * Seed zakłada konto administratora CRM oraz domyślne szablony wiadomości.
 * Dane bierze wyłącznie ze środowiska — żadnych haseł w kodzie (CLAUDE.md §7).
 */
async function main(): Promise<void> {
	const connectionString = process.env.DATABASE_URL
	const email = process.env.ADMIN_EMAIL
	const password = process.env.ADMIN_PASSWORD

	if (!connectionString) throw new Error('Brak DATABASE_URL')
	if (!email || !password) {
		throw new Error(
			'Brak ADMIN_EMAIL / ADMIN_PASSWORD. Dopisz do backend/.env:\n' +
				'  ADMIN_EMAIL=twoj@email.pl\n' +
				'  ADMIN_PASSWORD=minimum-12-znakow\n' +
				'potem uruchom ponownie: npm run seed',
		)
	}
	if (password.length < 12) {
		throw new Error('ADMIN_PASSWORD musi mieć co najmniej 12 znaków')
	}

	const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
	const passwordHash = await bcrypt.hash(password, 12)

	try {
		const admin = await prisma.adminUser.upsert({
			where: { email: email.toLowerCase() },
			update: { password: passwordHash, role: 'ADMIN' },
			create: { email: email.toLowerCase(), password: passwordHash, role: 'ADMIN', name: 'Administrator' },
		})
		console.log(`Admin gotowy: ${admin.email} (${admin.role})`)

		for (const template of DEFAULT_TEMPLATES) {
			await prisma.emailTemplate.upsert({
				where: { key: template.key },
				update: { name: template.name },
				create: template,
			})
		}
		console.log(`Szablony emaili gotowe: ${DEFAULT_TEMPLATES.map((template) => template.key).join(', ')}`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
