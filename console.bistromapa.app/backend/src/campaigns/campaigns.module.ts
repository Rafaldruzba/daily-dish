import { Module } from '@nestjs/common'

import { LeadsModule } from '../leads/leads.module'
import { CampaignJobsController, CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'
import { GoogleMapsProvider } from './providers/google-maps.provider'
import { MockLeadSourceProvider } from './providers/mock.provider'

@Module({
	imports: [LeadsModule],
	controllers: [CampaignsController, CampaignJobsController],
	providers: [CampaignsService, MockLeadSourceProvider, GoogleMapsProvider],
	exports: [CampaignsService],
})
export class CampaignsModule {}
