import { Injectable } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'

/** Kandydat na duplikat wraz z powodem dopasowania (readme §16). */
export interface DuplicateMatch {
	id: string
	name: string
	city: string
	phone: string | null
	email: string | null
	nip: string | null
	website: string | null
	status: string
	reasons: string[]
}

export interface LeadIdentity {
	name: string
	city: string
	phone?: string | null
	email?: string | null
	website?: string | null
	nip?: string | null
	excludeLeadId?: string
}

/** Telefon → same cyfry (bez kierunkowego 48, żeby 501 123 456 == +48 501 123 456). */
export function normalizePhone(value: string | null | undefined): string | null {
	if (!value) return null
	const digits = value.replace(/\D/g, '')
	if (digits.length < 9) return null

	const local = digits.startsWith('48') && digits.length > 9 ? digits.slice(2) : digits
	return local
}

export function normalizeWebsite(value: string | null | undefined): string | null {
	if (!value) return null

	const host = value
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, '')
		.replace(/^www\./, '')
		.split('/')[0]

	return host.includes('.') ? host : null
}

export function normalizeNip(value: string | null | undefined): string | null {
	if (!value) return null
	const digits = value.replace(/\D/g, '')
	return digits.length === 10 ? digits : null
}

export function normalizeText(value: string | null | undefined): string {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.replace(/[.,]/g, '')
}

/**
 * Wykrywanie potencjalnych duplikatów. Nic nie blokuje i nic nie usuwa —
 * zwraca listę kandydatów, decyzję podejmuje użytkownik (§16, §20).
 */
@Injectable()
export class DedupService {
	constructor(private readonly prisma: PrismaService) {}

	async findDuplicates(identity: LeadIdentity): Promise<DuplicateMatch[]> {
		const phone = normalizePhone(identity.phone)
		const website = normalizeWebsite(identity.website)
		const nip = normalizeNip(identity.nip)
		const email = identity.email?.trim().toLowerCase() || null
		const name = normalizeText(identity.name)
		const city = normalizeText(identity.city)

		// Najpierw zawężamy zbiór w bazie (indeksy), dopiero potem porównujemy
		// znormalizowane wartości w pamięci — inaczej trzeba by skanować całą tabelę.
		const candidates = await this.prisma.lead.findMany({
			where: {
				...(identity.excludeLeadId ? { id: { not: identity.excludeLeadId } } : {}),
				OR: [
					...(nip ? [{ nip: { contains: nip } }] : []),
					...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
					...(phone ? [{ phone: { contains: phone } }] : []),
					...(website ? [{ website: { contains: website.split('.')[0], mode: 'insensitive' as const } }] : []),
					...(name && city
						? [{ AND: [{ name: { contains: identity.name.trim(), mode: 'insensitive' as const } }, { city: { equals: identity.city.trim(), mode: 'insensitive' as const } }] }]
						: []),
				],
			},
			take: 25,
			orderBy: { createdAt: 'desc' },
		})

		const matches: DuplicateMatch[] = []

		for (const candidate of candidates) {
			const reasons: string[] = []

			if (nip && normalizeNip(candidate.nip) === nip) reasons.push('NIP')
			if (email && candidate.email?.trim().toLowerCase() === email) reasons.push('email')
			if (phone && normalizePhone(candidate.phone) === phone) reasons.push('telefon')
			if (website && normalizeWebsite(candidate.website) === website) reasons.push('strona')
			if (name && city && normalizeText(candidate.name) === name && normalizeText(candidate.city) === city) {
				reasons.push('nazwa + miasto')
			}

			if (reasons.length > 0) {
				matches.push({
					id: candidate.id,
					name: candidate.name,
					city: candidate.city,
					phone: candidate.phone,
					email: candidate.email,
					nip: candidate.nip,
					website: candidate.website,
					status: candidate.status,
					reasons,
				})
			}
		}

		return matches
	}
}
