export const GA_ID = process.env.NEXT_PUBLIC_GA_ID

type AnalyticsEvent =
	| 'view_restaurant'
	| 'search'
	| 'click_phone'
	| 'click_map'
	| 'click_website'
	| 'save_restaurant'
	| 'submit_review'
	| 'facebook_click'

export function trackEvent(event: AnalyticsEvent, parameters?: Record<string, string | number | boolean | undefined>) {
	if (typeof window === 'undefined') return
	if (!GA_ID) return

	window.gtag?.('event', event, parameters)
}
