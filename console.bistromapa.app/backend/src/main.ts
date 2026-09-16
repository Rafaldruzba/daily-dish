import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'

import { AppModule } from './app/app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule)
	const config = app.get(ConfigService)
	const logger = new Logger('Bootstrap')

	// Ciasteczko z JWT leci tylko na frontend CRM (§28) — z credentials: true.
	app.use(cookieParser())
	app.enableCors({
		origin: config.getOrThrow<string>('FRONTEND_URL'),
		credentials: true,
	})

	app.setGlobalPrefix('api')
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: { enableImplicitConversion: false },
		}),
	)
	app.useGlobalFilters(new AllExceptionsFilter())
	app.useGlobalInterceptors(new ResponseInterceptor())

	const port = config.get<number>('PORT') ?? 3002
	await app.listen(port)
	logger.log(`CRM Console API: http://localhost:${port}/api`)
}

void bootstrap()
