import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator'

import { PaginationQueryDto } from '../../common/dto/pagination.dto'

export class CreateFollowUpDto {
	@IsString()
	leadId: string

	@IsDateString({}, { message: 'Podaj poprawną datę follow-upu (ISO)' })
	scheduledAt: string

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	notes?: string
}

export class UpdateFollowUpDto {
	@IsOptional()
	@IsBoolean()
	completed?: boolean

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	notes?: string
}

export class QueryFollowUpsDto extends PaginationQueryDto {
	@IsOptional()
	@IsString()
	leadId?: string

	/** 'true' → tylko niezakończone. */
	@IsOptional()
	@IsString()
	pending?: string

	@IsOptional()
	@IsDateString()
	from?: string

	@IsOptional()
	@IsDateString()
	to?: string
}
