// Rdzeń metryk - skopiuj do backend, backend-console i scrappera.
// npm i prom-client
import client from 'prom-client'
import type { Request, Response, NextFunction } from 'express'

export const register = new client.Registry()

// CPU, RAM, heap, event loop lag, GC, open fds...
client.collectDefaultMetrics({ register })

// Nazwa i labele muszą zgadzać się z dashboardami Grafany
export const httpDuration = new client.Histogram({
	name: 'http_request_duration_seconds',
	help: 'Czas obsługi requestu HTTP',
	labelNames: ['method', 'route', 'status_code'],
	buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
	registers: [register],
})

export const httpInFlight = new client.Gauge({
	name: 'http_requests_in_flight',
	help: 'Liczba aktualnie obsługiwanych requestów',
	registers: [register],
})

export const unhandledErrors = new client.Counter({
	name: 'app_unhandled_errors_total',
	help: 'Nieobsłużone błędy aplikacji',
	labelNames: ['type'],
	registers: [register],
})

// Nie zmienia domyślnego zachowania Node (proces dalej się wywala jak zwykle)
process.on('uncaughtExceptionMonitor', () => unhandledErrors.inc({ type: 'uncaughtException' }))

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
	if (req.path === '/metrics') return next()
	const end = httpDuration.startTimer()
	httpInFlight.inc()
	res.on('close', () => {
		httpInFlight.dec()
		const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched'
		end({ method: req.method, route, status_code: res.statusCode })
	})
	next()
}

export async function metricsHandler(req: Request, res: Response) {
	const token = process.env.METRICS_TOKEN
	if (token && req.headers.authorization !== `Bearer ${token}`) {
		return res.sendStatus(401)
	}
	res.set('Content-Type', register.contentType)
	res.end(await register.metrics())
}
