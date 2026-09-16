import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common'

import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { PaginationQueryDto } from '../common/dto/pagination.dto'
import { SendEmailDto, UpdateTemplateDto } from './dto/email.dto'
import { EmailService } from './email.service'

@Controller('email')
export class EmailController {
	constructor(private readonly email: EmailService) {}

	@Get('templates')
	listTemplates() {
		return this.email.listTemplates()
	}

	@Put('templates/:id')
	@Roles('ADMIN')
	updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
		return this.email.updateTemplate(id, dto)
	}

	@Get('logs')
	listLogs(@Query() pagination: PaginationQueryDto, @Query('leadId') leadId?: string) {
		return this.email.listLogs(leadId, pagination.page, pagination.limit)
	}

	@Post('send')
	send(@Body() dto: SendEmailDto, @CurrentUser() user: AuthUser) {
		return this.email.send(dto, user.id)
	}
}
