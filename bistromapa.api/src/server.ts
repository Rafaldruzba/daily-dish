import 'dotenv/config'
import app from './app.js'
import { startDailyScheduler } from './services/scheduler.js'
import './services/scraper-queue.service.js'

const PORT = process.env.PORT || 3000

app.listen(Number(PORT), '0.0.0.0', async () => {
	console.log(`🚀 API działa na http://0.0.0.0:${PORT}`)
	startDailyScheduler()
})
