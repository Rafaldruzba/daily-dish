import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { LEAD_SOURCES, LEAD_STATUSES } from '../../common/domain.constants'

export const LEAD_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'city', 'status', 'lastContactAt', 'nextFollowUpAt'] as const
export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number]

/** Filtr follow-upów z readme §12: zaległe / dzisiaj / najbliższe 7 dni. */
export const FOLLOW_UP_FILTERS = ['overdue', 'today', 'week', 'none'] as const
export type FollowUpFilter = (typeof FOLLOW_UP_FILTERS)[number]

export class QueryLeadsDto extends PaginationQueryDto {
	@IsOptional()
	@IsString()
	@MaxLength(200)
	search?: string

	/** Lista rozdzielona przecinkami, np. "NEW,CONTACTED". */
	@IsOptional()
	@IsString()
	@MaxLength(200)
	status?: string

	@IsOptional()
	@IsString()
	@MaxLength(120)
	city?: string

	@IsOptional()
	@IsString()
	@MaxLength(80)
	category?: string

	@IsOptional()
	@IsIn(LEAD_SOURCES)
	source?: (typeof LEAD_SOURCES)[number]

	@IsOptional()
	@IsDateString()
	lastContactFrom?: string

	@IsOptional()
	@IsDateString()
	lastContactTo?: string

	@IsOptional()
	@IsIn(FOLLOW_UP_FILTERS)
	followUp?: FollowUpFilter

	@IsOptional()
	@IsIn(LEAD_SORT_FIELDS)
	sortBy?: LeadSortField

	@IsOptional()
	@IsIn(['asc', 'desc'])
	sortDir?: 'asc' | 'desc'
}

export function parseStatusList(value?: string): string[] {
	if (!value) return []

	return value
		.split(',')
		.map((item) => item.trim().toUpperCase())
		.filter((item): item is string => (LEAD_STATUSES as readonly string[]).includes(item))
}
