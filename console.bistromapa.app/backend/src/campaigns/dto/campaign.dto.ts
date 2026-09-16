import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'

import { PaginationQueryDto } from '../../common/dto/pagination.dto'

export class CreateCampaignDto {
	@IsString()
	@IsNotEmpty({ message: 'Nazwa kampanii jest wymagana' })
	@MaxLength(160)
	name: string

	@IsOptional()
	@IsString()
	@MaxLength(120)
	region?: string

	@IsOptional()
	@IsString()
	@MaxLength(80)
	category?: string

	/** Miasta do oblecenia — kampania rozbija się na zadania per miasto (readme §18). */
	@IsArray()
	@IsString({ each: true })
	cities: string[]

	@IsOptional()
	@IsString()
	@MaxLength(120)
	search?: string

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(200)
	limitPerJob?: number
}

export class QueryCampaignsDto extends PaginationQueryDto {
	@IsOptional()
	@IsIn(['RUNNING', 'PAUSED', 'COMPLETED'])
	status?: string
}
