import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common'
import type { Request } from 'express'

import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { CheckDuplicatesDto } from './dto/check-duplicates.dto'
import { CreateLeadDto } from './dto/create-lead.dto'
import { QueryLeadsDto } from './dto/query-leads.dto'
import { MergeLeadDto, UpdateConsentDto, UpdateLeadDto, UpdateLeadStatusDto } from './dto/update-lead.dto'
import { LeadsService } from './leads.service'

@Controller('leads')
export class LeadsController {
	constructor(private readonly leads: LeadsService) {}

	@Get()
	findAll(@Query() query: QueryLeadsDto) {
		return this.leads.findAll(query)
	}

	// Przed ':id' — inaczej "duplicates" zostałoby potraktowane jako identyfikator.
	@Get('duplicates')
	checkDuplicates(@Query() query: CheckDuplicatesDto) {
		return this.leads.checkDuplicates(query)
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.leads.findOne(id)
	}

	@Post()
	create(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthUser, @Req() request: Request) {
		return this.leads.create(dto, user.id, request.ip)
	}

	@Put(':id')
	update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: AuthUser, @Req() request: Request) {
		return this.leads.update(id, dto, user.id, request.ip)
	}

	@Put(':id/status')
	updateStatus(
		@Param('id') id: string,
		@Body() dto: UpdateLeadStatusDto,
		@CurrentUser() user: AuthUser,
		@Req() request: Request,
	) {
		return this.leads.updateStatus(id, dto, user.id, request.ip)
	}

	@Put(':id/consent')
	updateConsent(
		@Param('id') id: string,
		@Body() dto: UpdateConsentDto,
		@CurrentUser() user: AuthUser,
		@Req() request: Request,
	) {
		return this.leads.updateConsent(id, dto, user.id, request.ip)
	}

	@Post(':id/merge')
	merge(@Param('id') id: string, @Body() dto: MergeLeadDto, @CurrentUser() user: AuthUser, @Req() request: Request) {
		return this.leads.merge(id, dto, user.id, request.ip)
	}

	@Delete(':id')
	@Roles('ADMIN')
	remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() request: Request) {
		return this.leads.remove(id, user.id, request.ip)
	}
}
