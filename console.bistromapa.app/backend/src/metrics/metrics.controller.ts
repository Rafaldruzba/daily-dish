import { Controller, Get, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { metricsHandler } from '../lib/metrics'

@Controller()
export class MetricsController {
	@Get('metrics')
	async getMetrics(@Req() req: Request, @Res() res: Response) {
		return metricsHandler(req, res)
	}
}
