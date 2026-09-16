import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

import { CONSENT_STATUSES, LEAD_SOURCES, LEAD_STATUSES, ONBOARDING_STATUSES, type ConsentStatus, type LeadSource, type LeadStatus, type OnboardingStatus } from '../../common/domain.constants'

/** Wszystkie pola opcjonalne — aktualizacja częściowa (readme §13). */
export class UpdateLeadDto {
	@IsOptional()
	@IsString()
	@MaxLength(200)
	name?: string

	@IsOptional()
	@IsString()
	@MaxLength(120)
	city?: string

	@IsOptional()
	@IsString()
	@MaxLength(300)
	address?: string

	@IsOptional()
	@IsString()
	@MaxLength(40)
	phone?: string

	@IsOptional()
	@IsEmail({}, { message: 'Podaj poprawny adres email' })
	email?: string

	@IsOptional()
	@IsString()
	@MaxLength(300)
	website?: string

	@IsOptional()
	@IsString()
	@MaxLength(20)
	nip?: string

	@IsOptional()
	@IsString()
	@MaxLength(80)
	category?: string

	@IsOptional()
	@IsString()
	@MaxLength(160)
	contactPerson?: string

	@IsOptional()
	@IsIn(LEAD_SOURCES)
	source?: LeadSource

	@IsOptional()
	@IsString()
	@MaxLength(500)
	sourceUrl?: string

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	notes?: string
}

export class UpdateLeadStatusDto {
	@IsIn(LEAD_STATUSES, { message: 'Nieznany status leada' })
	status: LeadStatus
}

export class UpdateOnboardingStatusDto {
	@IsIn(ONBOARDING_STATUSES, { message: 'Nieznany status onboardingu' })
	onboardingStatus: OnboardingStatus

	@IsOptional()
	@IsString()
	@MaxLength(500)
	lastError?: string
}

export class UpdateConsentDto {
	@IsIn(CONSENT_STATUSES, { message: 'Nieznany status zgody' })
	consentStatus: ConsentStatus

	@IsOptional()
	@IsString()
	@MaxLength(200)
	consentSource?: string

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	consentNotes?: string
}

export class MergeLeadDto {
	/** Lead, który zostaje wchłonięty i usunięty. */
	@IsString()
	sourceLeadId: string

	@IsOptional()
	@IsBoolean()
	keepSourceAsDeclined?: boolean
}
