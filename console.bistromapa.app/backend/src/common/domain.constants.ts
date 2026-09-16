/** Jedno źródło prawdy dla wartości ze schema.prisma (readme §5-8, §22). */

export const LEAD_STATUSES = [
	'NEW',
	'CONTACTED',
	'NO_RESPONSE',
	'CALL_BACK',
	'INTERESTED',
	'ACCEPTED',
	'DECLINED',
] as const

export const ONBOARDING_STATUSES = [
	'NOT_STARTED',
	'CREATE_QUEUED',
	'ACCOUNT_CREATED',
	'INVITATION_SENT',
	'ACTIVATED',
	'ERROR',
] as const

export const LEAD_SOURCES = [
	'GOOGLE_MAPS',
	'WEBSITE',
	'FACEBOOK',
	'CSV',
	'MANUAL',
	'REFERRAL',
	'OTHER',
] as const

export const INTERACTION_TYPES = ['PHONE', 'EMAIL', 'SMS', 'NOTE', 'OTHER'] as const

export const CONSENT_STATUSES = ['GIVEN', 'DENIED', 'PENDING'] as const

export const CAMPAIGN_STATUSES = ['RUNNING', 'PAUSED', 'COMPLETED'] as const

export const CAMPAIGN_JOB_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'ERROR'] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number]
export type LeadSource = (typeof LEAD_SOURCES)[number]
export type InteractionType = (typeof INTERACTION_TYPES)[number]
export type ConsentStatus = (typeof CONSENT_STATUSES)[number]
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]
export type CampaignJobStatus = (typeof CAMPAIGN_JOB_STATUSES)[number]

/** Kontakt = próba kontaktu; notatka nią nie jest (readme §9-10). */
export const CONTACT_TYPES: InteractionType[] = ['PHONE', 'EMAIL', 'SMS']
