import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

import { INTERACTION_TYPES, type InteractionType } from '../../common/domain.constants'

export class CreateInteractionDto {
	@IsString()
	leadId: string

	@IsIn(INTERACTION_TYPES, { message: 'Nieznany typ interakcji' })
	type: InteractionType

	@IsOptional()
	@IsString()
	@MaxLength(4000)
	content?: string

	@IsOptional()
	@IsString()
	@MaxLength(160)
	contactPerson?: string
}
