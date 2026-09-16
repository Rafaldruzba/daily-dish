import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

/** Wspólna paginacja dla list (readme §35 — paginacja po stronie backendu). */
export class PaginationQueryDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page: number = 1

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(200)
	limit: number = 20

	get skip(): number {
		return (this.page - 1) * this.limit
	}
}

export interface Paginated<T> {
	items: T[]
	total: number
	page: number
	limit: number
	pages: number
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
	return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
}
