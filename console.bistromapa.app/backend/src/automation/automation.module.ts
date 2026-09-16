import { Module } from '@nestjs/common'

import { EmailModule } from '../email/email.module'
import { BistroMapaApiClient } from '../integrations/bistromapa-api.client'
import { AutomationController } from './automation.controller'
import { AutomationService } from './automation.service'

@Module({
	imports: [EmailModule],
	controllers: [AutomationController],
	providers: [AutomationService, BistroMapaApiClient],
	exports: [AutomationService],
})
export class AutomationModule {}
