export interface FacebookDishResult {
	name: string
	description?: string
	price?: number
	imageUrl?: string
	sourceUrl?: string
	sourcePostId?: string
	publishedAt?: Date
}

export interface NominatimResult {
	lat: string
	lon: string
	display_name: string
}

export interface GoogleGeocodeResult {
	results: Array<{
		geometry: {
			location: {
				lat: number
				lng: number
			}
		}
	}>
	status: string
}