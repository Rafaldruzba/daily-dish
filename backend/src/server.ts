import 'dotenv/config'
import app from './app.js'
import { startDailyScheduler } from './services/scheduler.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
	console.log(`🚀 API działa na http://localhost:${PORT}`)
	startDailyScheduler()
})
