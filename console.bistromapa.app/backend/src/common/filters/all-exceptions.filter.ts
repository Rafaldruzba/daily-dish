import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Response } from 'express'

/** Jednolity kształt błędu: { success: false, error: { message, statusCode, details? } }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name)

	catch(exception: unknown, host: ArgumentsHost): void {
		const response = host.switchToHttp().getResponse<Response>()

		const isHttp = exception instanceof HttpException
		const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
		const body = isHttp ? exception.getResponse() : null

		let message = 'Wewnętrzny błąd serwera'
		let details: unknown
		if (typeof body === 'string') {
			message = body
		} else if (body && typeof body === 'object' && 'message' in body) {
			const raw = (body as { message: string | string[] }).message
			message = Array.isArray(raw) ? raw.join('; ') : raw
			details = (body as { details?: unknown }).details
		}

		if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
			this.logger.error(exception instanceof Error ? exception.message : String(exception), exception instanceof Error ? exception.stack : undefined)
		}

		response.status(status).json({
			success: false,
			error: { message, statusCode: status, ...(details === undefined ? {} : { details }) },
		})
	}
}
