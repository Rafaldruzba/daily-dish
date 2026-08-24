import 'dotenv/config'
import app from './app.js'
import { startDailyScheduler } from './services/scheduler.js'
import { seedLocalMockData } from './services/seed.service.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, async () => {
	console.log(`🚀 API działa na http://localhost:${PORT}`)
	await seedLocalMockData()
	startDailyScheduler()
})
