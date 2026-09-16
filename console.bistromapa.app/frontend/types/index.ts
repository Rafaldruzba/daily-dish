export type LeadStatus =
	| 'NEW'
	| 'CONTACTED'
	| 'NO_RESPONSE'
	| 'CALL_BACK'
	| 'INTERESTED'
	| 'ACCEPTED'
	| 'DECLINED'

export type OnboardingStatus =
	| 'NOT_STARTED'
	| 'CREATE_QUEUED'
	| 'ACCOUNT_CREATED'
	| 'INVITATION_SENT'
	| 'ACTIVATED'
	| 'ERROR'

export type ConsentStatus = 'GIVEN' | 'DENIED' | 'PENDING'

export type LeadSource =
	| 'GOOGLE_MAPS'
	| 'WEBSITE'
	| 'FACEBOOK'
	| 'CSV'
	| 'MANUAL'
	| 'REFERRAL'
	| 'OTHER'

export type InteractionType = 'PHONE' | 'EMAIL' | 'SMS' | 'NOTE' | 'OTHER'

export interface Lead {
	id: string
	name: string
	city: string
	address: string | null
	phone: string | null
	email: string | null
	website: string | null
	nip: string | null
	category: string | null
	contactPerson: string | null
	source: LeadSource
	sourceUrl: string | null
	status: LeadStatus
	onboardingStatus: OnboardingStatus
	consentStatus: ConsentStatus | null
	consentSource: string | null
	consentAt: string | null
	consentNotes: string | null
	contactAttempts: number
	lastContactAt: string | null
	nextFollowUpAt: string | null
	notes: string | null
	bistroRestaurantId: string | null
	bistroUserId: string | null
	campaignJobId: string | null
	createdAt: string
	updatedAt: string
	_count?: { interactions: number; followUps: number }
}

export interface Interaction {
	id: string
	leadId: string
	type: InteractionType
	content: string | null
	contactPerson: string | null
	createdAt: string
}

export interface FollowUp {
	id: string
	leadId: string
	scheduledAt: string
	completed: boolean
	notes: string | null
	completedAt: string | null
	createdAt: string
	lead?: Pick<Lead, 'id' | 'name' | 'city' | 'phone' | 'status'>
}

export interface AuditLogEntry {
	id: string
	action: string
	details: string | null
	createdAt: string
	adminUser?: { email: string; name: string | null } | null
}

export interface LeadDetail extends Lead {
	interactions: Interaction[]
	followUps: FollowUp[]
	auditLogs: AuditLogEntry[]
	campaignJob?: {
		id: string
		city: string | null
		category: string | null
		campaign: { id: string; name: string }
	} | null
}

export interface DuplicateMatch {
	id: string
	name: string
	city: string
	phone: string | null
	email: string | null
	nip: string | null
	website: string | null
	status: LeadStatus
	reasons: string[]
}

export interface DashboardStats {
	leads: { total: number; byStatus: Record<string, number> }
	followUps: { today: number; overdue: number; upcoming: number }
	onboarding: { pending: number; errors: number }
	recentLeads: Lead[]
	todayFollowUps: FollowUp[]
	overdueFollowUps: FollowUp[]
	recentInteractions: (Interaction & { lead: { id: string; name: string } })[]
}

export interface CurrentUser {
	id: string
	email: string
	role: 'ADMIN' | 'MANAGER'
	name: string | null
}

export interface Paginated<T> {
	items: T[]
	total: number
	page: number
	limit: number
	pages: number
}

export type ImportTargetField =
	| 'name'
	| 'city'
	| 'address'
	| 'phone'
	| 'email'
	| 'website'
	| 'nip'
	| 'category'
	| 'contactPerson'
	| 'notes'

export interface ImportPreview {
	importId: string
	headers: string[]
	mapping: Record<ImportTargetField, string | null>
	totalRows: number
	sampleRows: Record<string, string>[]
	validRows: number
	issues: { row: number; errors: string[] }[]
	duplicates: { row: number; name: string; city: string; duplicateOf: string; reasons: string[] }[]
	truncated: boolean
}

export type CampaignJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR'

export interface CampaignJob {
	id: string
	city: string | null
	category: string | null
	search: string | null
	limit: number
	status: CampaignJobStatus
	resultsFound: number
	newLeads: number
	duplicates: number
	retryCount: number
	errorMsg: string | null
	startedAt: string | null
	completedAt: string | null
}

export interface Campaign {
	id: string
	name: string
	region: string | null
	category: string | null
	status: 'RUNNING' | 'PAUSED' | 'COMPLETED'
	createdAt: string
	jobs?: CampaignJob[]
	summary?: { resultsFound: number; newLeads: number; duplicates: number; pending: number }
	_count?: { jobs: number }
}

export interface EmailTemplate {
	id: string
	key: string
	name: string
	subject: string
	body: string
	updatedAt: string
}

export interface EmailLogEntry {
	id: string
	to: string
	subject: string
	status: 'SENT' | 'ERROR'
	error: string | null
	sentAt: string
	lead?: { id: string; name: string } | null
}

export interface AutomationLogEntry {
	id: string
	action: string
	status: 'SUCCESS' | 'ERROR'
	error: string | null
	durationMs: number | null
	attempt: number
	createdAt: string
	lead?: { id: string; name: string; city: string } | null
}

export interface AutomationStatus {
	integrationConfigured: boolean
	emailConfigured: boolean
	leads: { pending: number; queued: number; errors: number; activated: number }
}
