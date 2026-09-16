import { Controller, Get, Query } from '@nestjs/common'

import { PaginationQueryDto } from '../common/dto/pagination.dto'
import { AuditService } from './audit.service'

@Controller('audit')
export class AuditController {
	constructor(private readonly audit: AuditService) {}

	@Get()
	async findMany(
		@Query() pagination: PaginationQueryDto,
		@Query('leadId') leadId?: string,
		@Query('action') action?: string,
	) {
		const { items, total } = await this.audit.findMany({
			leadId,
			action,
			page: pagination.page,
			limit: pagination.limit,
		})

		return {
			items,
			total,
			page: pagination.page,
			limit: pagination.limit,
			pages: Math.max(1, Math.ceil(total / pagination.limit)),
		}
	}
}
