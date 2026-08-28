export interface DailyDish {
	id: string
	restaurantId: string
	name: string
	description: string | null
	price: string | number | null
	imageUrl: string | null
	sourceUrl?: string | null
	date: string
	createdAt?: string
	restaurant?: Restaurant
}

export interface StandardOffer {
	id: string
	title: string
	description: string | null
	price: number | null
	imageUrl: string | null
	isActive: boolean
}

export interface MenuItem {
	id: string
	restaurantId?: string
	name: string
	description: string | null
	price: number
	category: string
	order: number
	createdAt?: string
}

export interface RawSubscription {
	id: string
	restaurantId: string
	type: 'BASE' | 'PROMOTION' | 'STATIC_MENU' | 'FREE_TRIAL'
	status: string
	startsAt: string
	endsAt: string
}

export interface Subscription {
	id: string
	plan?: string
	type?: string
	status: string
	currentPeriodEnd: string
}

export interface Restaurant {
	id: string
	name: string
	slug: string
	phone: string | null
	address: string | null
	city: string
	facebookUrl: string | null
	isActive: boolean
	rating: number | null
	status: string
	views: number
	latitude?: number | null
	longitude?: number | null
	isPromoted?: boolean
	subscription?: Subscription | null
	subscriptions?: RawSubscription[]
	user?: { name: string | null; email: string } | null
}

export interface RestaurantDetail extends Restaurant {
	dishes: DailyDish[]
	standardOffers: StandardOffer[]
	menuItems: MenuItem[]
}

export interface RestaurantForm {
	name: string
	slug: string
	phone: string
	address: string
	city: string
	facebookUrl: string
	rating: number
}

export interface Payment {
	id: string
	amount: number
	currency: string
	status: string
	provider: string
	createdAt: string
}