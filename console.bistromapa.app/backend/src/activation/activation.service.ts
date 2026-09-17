import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { AuditService } from '../audit/audit.service'
import { BistroMapaApiClient } from '../integrations/bistromapa-api.client'
import { PrismaService } from '../prisma/prisma.service'

/** Dane, które wolno pokazać na publicznej stronie aktywacji (bez danych wrażliwych). */
export interface ActivationInfo {
	restaurantName: string
	email: string
	expiresAt: string | null
}

/**
 * Aktywacja konta właściciela restauracji z linku w emailu (readme §24).
 *
 * Token trzyma CRM (Lead.activationToken) — to CRM wysyła zaproszenie, więc
 * tylko on może je zweryfikować. Samo ustawienie hasła wykonuje główny backend
 * BistroMapy przez wywołanie server-to-server (§33), bo konto istnieje w tamtej bazie.
 */
@Injectable()
export class ActivationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly bistro: BistroMapaApiClient,
		private readonly audit: AuditService,
	) {}

	/** Podgląd przed ustawieniem hasła — pozwala pokazać, kogo dotyczy zaproszenie. */
	async preview(token: string): Promise<ActivationInfo> {
		const lead = await this.findActiveLead(token)

		return {
			restaurantName: lead.name,
			email: maskEmail(lead.email ?? ''),
			expiresAt: lead.activationTokenExpiry?.toISOString() ?? null,
		}
	}

	/** Ustawienie hasła i domknięcie onboardingu. Token jest jednorazowy (readme §24). */
	async activate(token: string, password: string): Promise<void> {
		const lead = await this.findActiveLead(token)

		if (!lead.bistroUserId) {
			throw new BadRequestException('Konto w BistroMapie nie zostało jeszcze utworzone — skontaktuj się z nami')
		}

		await this.bistro.activateUserAccount(lead.bistroUserId, password)

		await this.prisma.lead.update({
			where: { id: lead.id },
			data: {
				activationToken: null,
				activationTokenExpiry: null,
				onboardingStatus: 'ACTIVATED',
			},
		})

		await this.audit.log({
			action: 'ACCOUNT_ACTIVATED',
			leadId: lead.id,
			details: { restaurantId: lead.bistroRestaurantId, userId: lead.bistroUserId },
		})
	}

	private async findActiveLead(token: string) {
		const lead = await this.prisma.lead.findUnique({ where: { activationToken: token } })

		if (!lead) {
			throw new NotFoundException('Link aktywacyjny jest nieprawidłowy')
		}

		if (lead.activationTokenExpiry && new Date() > lead.activationTokenExpiry) {
			throw new BadRequestException('Link aktywacyjny wygasł — poproś o nowe zaproszenie')
		}

		return lead
	}
}

/** jkowalski@example.com → j•••••••••@example.com */
export function maskEmail(email: string): string {
	const [local, domain] = email.split('@')
	if (!domain) return email

	return `${local.slice(0, 1)}${'•'.repeat(Math.max(local.length - 1, 3))}@${domain}`
}
