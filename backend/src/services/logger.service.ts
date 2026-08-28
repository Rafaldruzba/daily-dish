import prisma from '../lib/prisma.js'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR'

export async function logToDb(level: LogLevel, message: string, context?: any) {
	// Print to console first
	const timestamp = new Date().toISOString()
	const consoleMsg = `[${timestamp}] [${level}] ${message}`
	if (level === 'ERROR') {
		console.error(consoleMsg, context || '')
	} else if (level === 'WARN') {
		console.warn(consoleMsg, context || '')
	} else {
		console.log(consoleMsg, context || '')
	}

	// Persist to database asynchronously so it doesn't block the request
	try {
		const contextStr = context 
			? typeof context === 'string' 
				? context 
				: JSON.stringify(context) 
			: null

		await prisma.systemLog.create({
			data: {
				level,
				message,
				context: contextStr,
			},
		})
	} catch (err) {
		console.error('❌ Failed to save log to database:', err)
	}
}

export const logger = {
	info: (message: string, context?: any) => logToDb('INFO', message, context),
	warn: (message: string, context?: any) => logToDb('WARN', message, context),
	error: (message: string, context?: any) => logToDb('ERROR', message, context),
}

export default logger
