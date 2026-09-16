import { Module } from '@nestjs/common'

import { LeadsModule } from '../leads/leads.module'
import { ImportController } from './import.controller'
import { ImportService } from './import.service'

@Module({
	imports: [LeadsModule],
	controllers: [ImportController],
	providers: [ImportService],
})
export class ImportModule {}
