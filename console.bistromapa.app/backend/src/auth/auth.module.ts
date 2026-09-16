import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'

@Module({
	imports: [
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				secret: config.getOrThrow<string>('JWT_SECRET'),
				signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '12h' },
			}),
		}),
	],
	controllers: [AuthController],
	providers: [
		AuthService,
		// Kolejność ma znaczenie: najpierw sesja, potem role.
		{ provide: APP_GUARD, useClass: JwtAuthGuard },
		{ provide: APP_GUARD, useClass: RolesGuard },
	],
	// JwtModule w eksporcie — globalny APP_GUARD jest instancjonowany w kontekście
	// AppModule, więc JwtService musi być tam widoczny.
	exports: [AuthService, JwtModule],
})
export class AuthModule {}
