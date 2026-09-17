import type { Lead } from '@/types'

export type TemplateVariables = Record<string, string | null | undefined>

/**
 * Podstawia `{{zmienna}}` w treści szablonu.
 *
 * Lustrzane odbicie `renderTemplate()` z backendu (email/email.service.ts) — ten sam
 * wzorzec i ta sama zasada „brak zmiennej = pusty string". Dzięki temu podgląd w panelu
 * pokazuje dokładnie to, co zostanie wysłane.
 */
export function fillTemplate(template: string, variables: TemplateVariables): string {
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => variables[key] ?? '')
}

/** Zmienne, które backend wypełnia danymi leada (readme §23). */
export function leadVariables(lead: Pick<Lead, 'name' | 'city' | 'address' | 'phone' | 'contactPerson' | 'email' | 'website'>): TemplateVariables {
	return {
		name: lead.name,
		city: lead.city,
		address: lead.address,
		phone: lead.phone,
		contactPerson: lead.contactPerson,
		email: lead.email,
		website: lead.website,
	}
}

/** Nazwy zmiennych do podpowiedzi w UI — bez `activationUrl`, który wypełnia automatyzacja. */
export const TEMPLATE_VARIABLE_HINT = ['name', 'city', 'address', 'phone', 'contactPerson', 'email', 'website']
