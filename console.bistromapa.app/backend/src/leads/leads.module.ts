import { Module } from '@nestjs/common'

import { DedupService } from './dedup.service'
import { LeadsController } from './leads.controller'
import { LeadsService } from './leads.service'

@Module({
	controllers: [LeadsController],
	providers: [LeadsService, DedupService],
	exports: [LeadsService, DedupService],
})
export class LeadsModule {}
