import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'

import { CreateFollowUpDto, QueryFollowUpsDto, UpdateFollowUpDto } from './dto/follow-up.dto'
import { FollowUpsService } from './follow-ups.service'

@Controller('follow-ups')
export class FollowUpsController {
	constructor(private readonly followUps: FollowUpsService) {}

	@Get()
	findMany(@Query() query: QueryFollowUpsDto) {
		return this.followUps.findMany(query)
	}

	@Post()
	create(@Body() dto: CreateFollowUpDto) {
		return this.followUps.create(dto)
	}

	@Put(':id')
	update(@Param('id') id: string, @Body() dto: UpdateFollowUpDto) {
		return this.followUps.update(id, dto)
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.followUps.remove(id)
	}
}
