import { Module } from '@nestjs/common'

import { BistroMapaApiClient } from '../integrations/bistromapa-api.client'
import { ActivationController } from './activation.controller'
import { ActivationService } from './activation.service'

@Module({
	controllers: [ActivationController],
	providers: [ActivationService, BistroMapaApiClient],
})
export class ActivationModule {}
