import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { validateEnv } from '../config/env.validation'
import { PrismaModule } from '../prisma/prisma.module'

import { AuditModule } from '../audit/audit.module'
import { ActivationModule } from '../activation/activation.module'
import { AuthModule } from '../auth/auth.module'
import { AutomationModule } from '../automation/automation.module'
import { CampaignsModule } from '../campaigns/campaigns.module'
import { DashboardModule } from '../dashboard/dashboard.module'
import { EmailModule } from '../email/email.module'
import { FollowUpsModule } from '../follow-ups/follow-ups.module'
import { ImportModule } from '../import/import.module'
import { InteractionsModule } from '../interactions/interactions.module'
import { LeadsModule } from '../leads/leads.module'

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
		ScheduleModule.forRoot(),
		// Globalny limit; logowanie ma ostrzejszy (patrz AuthController).
		ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
		PrismaModule,
		AuditModule,
		AuthModule,
		ActivationModule,
		LeadsModule,
		InteractionsModule,
		FollowUpsModule,
		DashboardModule,
		ImportModule,
		CampaignsModule,
		EmailModule,
		AutomationModule,
	],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
