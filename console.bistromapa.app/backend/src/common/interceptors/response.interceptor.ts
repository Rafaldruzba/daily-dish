import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, map } from 'rxjs'

/**
 * Każda odpowiedź wychodzi jako { success: true, data } — kontrakt wspólny
 * dla frontendu (frontend/lib/api.ts). Kontrolery zwracają same dane.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { success: true; data: T }> {
	intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<{ success: true; data: T }> {
		return next.handle().pipe(map((data) => ({ success: true as const, data })))
	}
}
