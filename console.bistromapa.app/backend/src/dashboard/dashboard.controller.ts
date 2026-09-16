import { Controller, Get } from '@nestjs/common'

import { DashboardService } from './dashboard.service'

@Controller('stats')
export class DashboardController {
	constructor(private readonly dashboard: DashboardService) {}

	@Get()
	getStats() {
		return this.dashboard.getStats()
	}
}
