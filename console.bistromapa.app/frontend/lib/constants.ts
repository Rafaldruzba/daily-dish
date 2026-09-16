export const LEAD_STATUSES = [
	'NEW',
	'CONTACTED',
	'NO_RESPONSE',
	'CALL_BACK',
	'INTERESTED',
	'ACCEPTED',
	'DECLINED',
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
