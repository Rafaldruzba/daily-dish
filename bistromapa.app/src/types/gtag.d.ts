export {}

declare global {
	interface Window {
		dataLayer: Record<string, unknown>[]
		gtag: (command: string, eventName: string, parameters?: Record<string, unknown>) => void
	}
}
