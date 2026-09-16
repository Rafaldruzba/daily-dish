import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'

import { PaginationQueryDto } from '../common/dto/pagination.dto'
import { Roles } from '../auth/roles.decorator'
import { CreateInteractionDto } from './dto/create-interaction.dto'
import { InteractionsService } from './interactions.service'

@Controller('interactions')
export class InteractionsController {
	constructor(private readonly interactions: InteractionsService) {}

	@Get()
	findByLead(@Query() pagination: PaginationQueryDto, @Query('leadId') leadId: string) {
		return this.interactions.findByLead(leadId, pagination.page, pagination.limit)
	}

	@Post()
	create(@Body() dto: CreateInteractionDto) {
		return this.interactions.create(dto)
	}

	@Delete(':id')
	@Roles('ADMIN')
	remove(@Param('id') id: string) {
		return this.interactions.remove(id)
	}
}
