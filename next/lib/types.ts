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

export interface User {
	id: string
	email: string
	name: string | null
	role: string
	city: string | null
	nip?: string | null
	ownershipDeclaration?: OwnershipDeclaration | null
}
export interface OwnershipDeclaration {
	nip: string | null
	ownerPhone: string | null
}

export interface AuthContextType {
	user: User | null
	token: string | null
	favorites: string[] // IDs of favorite restaurants
	loading: boolean
	login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
	register: (
		email: string,
		password: string,
		name?: string,
		accountType?: string,
		city?: string,
		nip?: string,
		ownerPhone?: string,
		representsSelf?: boolean,
		acceptedTerms?: boolean,
	) => Promise<{ success: boolean; message?: string }>
	verifyRegister: (email: string, code: string) => Promise<{ success: boolean; message?: string }>
	logout: () => void
	toggleFavorite: (restaurantId: string) => Promise<boolean>
	isFavorite: (restaurantId: string) => boolean
}

export interface LocationContextType {
	city: string
	setCity: (city: string) => void
	language: string
	setLanguage: (lang: string) => void
}

export interface Coords {
	lat: number
	lng: number
}

export interface RestaurantWithCoords extends Restaurant {
	coords: Coords | null
}

export interface RestaurantDetail {
	id: string
	name: string
	slug: string
	phone: string | null
	address: string | null
	city: string
	facebookUrl: string | null
	rating: number | null
	description: string | null
	generalMenu: string | null
	views: number
	userId: string | null
	latitude: number | null
	longitude: number | null
	subscriptions: Subscription[]
	dishes: Array<{
		id: string
		name: string
		description: string | null
		price: number | null
		imageUrl: string | null
		sourceUrl: string | null
		sourcePostId: string | null
		publishedAt: string
	}>
	standardOffers?: Array<{
		id: string
		title: string
		description: string | null
		price: number | null
		imageUrl: string | null
		isActive: boolean
	}>
	menuItems?: MenuItem[]
}

export interface EditFormState {
	name: string
	phone: string
	address: string
	city: string
	facebookUrl: string
	description: string
	generalMenu: string
	staticOfferTitle: string
	staticOfferDesc: string
	staticOfferPrice: string
	staticOfferImg: string
}
