import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import type { Request } from 'express'

import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { CampaignsService } from './campaigns.service'
import { CreateCampaignDto, QueryCampaignsDto } from './dto/campaign.dto'

@Controller('campaigns')
export class CampaignsController {
	constructor(private readonly campaigns: CampaignsService) {}

	@Get()
	findAll(@Query() query: QueryCampaignsDto) {
		return this.campaigns.findAll(query)
	}

	@Get('provider')
	provider() {
		return this.campaigns.activeProvider
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.campaigns.findOne(id)
	}

	@Post()
	@Roles('ADMIN')
	create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthUser, @Req() request: Request) {
		return this.campaigns.create(dto, user.id, request.ip)
	}

	@Post(':id/run')
	run(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() request: Request) {
		return this.campaigns.run(id)
	}
}

@Controller('campaign-jobs')
export class CampaignJobsController {
	constructor(private readonly campaigns: CampaignsService) {}

	@Post(':id/run')
	run(@Param('id') id: string) {
		return this.campaigns.runJob(id)
	}

	@Post(':id/retry')
	retry(@Param('id') id: string) {
		return this.campaigns.retryJob(id)
	}
}
