import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * Prisma 7 wymaga driver adaptera — wzorzec przejęty z głównego backendu
 * (bistromapa.api/src/lib/prisma.ts), żeby oba projekty działały tak samo.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(PrismaService.name)

	constructor(config: ConfigService) {
		const connectionString = config.getOrThrow<string>('DATABASE_URL')
		super({ adapter: new PrismaPg({ connectionString }) })
	}

	async onModuleInit(): Promise<void> {
		await this.$connect()
		// $connect() z driver adapterem jest leniwe — dopiero realne zapytanie
		// pokazuje, czy baza istnieje i ma migracje.
		await this.$queryRaw`SELECT 1`
		this.logger.log('Połączono z bazą CRM')
	}

	async onModuleDestroy(): Promise<void> {
		await this.$disconnect()
	}
}
