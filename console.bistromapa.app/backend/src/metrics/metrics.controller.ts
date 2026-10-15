import { Controller, Get, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { Public } from '../auth/public.decorator'
import { metricsHandler } from '../lib/metrics'

@Controller()
@Public()
export class MetricsController {
	@Get('metrics')
	async getMetrics(@Req() req: Request, @Res() res: Response) {
		return metricsHandler(req, res)
	}
}
