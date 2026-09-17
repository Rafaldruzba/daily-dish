import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { Public } from '../auth/public.decorator'
import { ActivationService, type ActivationInfo } from './activation.service'
import { ActivateAccountDto } from './dto/activate-account.dto'

/**
 * Publiczne endpointy dla strony aktywacji w aplikacji głównej (bistromapa.app/auth/activate/<token>).
 * Wywołuje je przeglądarka właściciela restauracji — bez sesji CRM, dlatego @Public().
 * Globalny throttling jest za luźny dla zgadywania tokenów, stąd ostrzejszy limit.
 */
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('activation')
export class ActivationController {
	constructor(private readonly activation: ActivationService) {}

	@Get(':token')
	preview(@Param('token') token: string): Promise<ActivationInfo> {
		return this.activation.preview(token)
	}

	@Post(':token')
	async activate(@Param('token') token: string, @Body() dto: ActivateAccountDto): Promise<{ activated: true }> {
		await this.activation.activate(token, dto.password)
		return { activated: true }
	}
}
