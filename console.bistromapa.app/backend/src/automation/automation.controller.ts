import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { PaginationQueryDto } from '../common/dto/pagination.dto'
import { AutomationService } from './automation.service'

@Controller('automation')
export class AutomationController {
	constructor(private readonly automation: AutomationService) {}

	/** Ekran /automation (readme §27). */
	@Get('logs')
	listLogs(
		@Query() pagination: PaginationQueryDto,
		@Query('leadId') leadId?: string,
		@Query('action') action?: string,
		@Query('status') status?: string,
	) {
		return this.automation.listLogs({
			leadId,
			action,
			status,
			page: pagination.page,
			limit: pagination.limit,
		})
	}

	@Get('status')
	status() {
		return this.automation.status()
	}

	/** Ręczne uruchomienie cyklu — to samo, co robi cron o 00:00. */
	@Post('run')
	@Roles('ADMIN')
	run() {
		return this.automation.runCycleNow()
	}

	@Post(':leadId/retry')
	retry(@Param('leadId') leadId: string, @CurrentUser() user: AuthUser) {
		return this.automation.retry(leadId, user.id)
	}

	@Post(':leadId/activate')
	@Roles('ADMIN')
	activate(@Param('leadId') leadId: string, @CurrentUser() user: AuthUser) {
		return this.automation.markActivated(leadId, user.id)
	}
}
