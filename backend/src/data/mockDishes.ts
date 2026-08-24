export interface MockRestaurant {
	id: string
	name: string
	slug: string
	phone: string
	address: string
	city: string
	facebookUrl: string
	isActive: boolean
	status: string
	rating: number
	description: string
	generalMenu: string
	latitude?: number
	longitude?: number
	userId?: string
}

export interface MockDish {
	name: string
	description: string
	price: number
	imageUrl: string
	sourceUrl: string
	sourcePostId: string
}

export interface MockOwner {
	id: string;
	email: string;
	password: string;
	name: string;
	role: string;
}

export const MOCK_OWNERS: MockOwner[] = [
	{
		id: 'owner-borowianka-uuid-1111',
		email: 'borowianka@owner.com',
		password: 'password123',
		name: 'Właściciel Borowianki',
		role: 'OWNER'
	},
	{
		id: 'owner-lochowianka-uuid-2222',
		email: 'lochowianka@owner.com',
		password: 'password123',
		name: 'Właściciel Lochowianki',
		role: 'OWNER'
	},
	{
		id: 'owner-hustawka-uuid-3333',
		email: 'hustawka@owner.com',
		password: 'password123',
		name: 'Właściciel Huśtawki',
		role: 'OWNER'
	}
]

export const MOCK_RESTAURANTS: MockRestaurant[] = [
	{
		id: '7a1a6b0c-99fa-4785-b82b-5813f8c8715a',
		name: 'Zielona Miska',
		slug: 'zielona-miska',
		phone: '123 456 789',
		address: 'ul. Piotrkowska 120',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/zielonamiska',
		isActive: true,
		status: 'APPROVED',
		rating: 4.8,
		description: 'Zdrowe i świeże dania wegetariańskie oraz wegańskie przygotowywane codziennie z lokalnych produktów.',
		generalMenu: 'Kremy warzywne, wege burgery, miski obfitości (Buddha Bowls), świeżo wyciskane soki.',
		latitude: 51.7687,
		longitude: 19.4560
	},
	{
		id: 'c0a2f4a4-436d-4952-bdae-e962bbcf33d9',
		name: 'Pizzeria Bella Italia',
		slug: 'pizzeria-bella-italia',
		phone: '987 654 321',
		address: 'ul. Sienkiewicza 45',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/bellapizza',
		isActive: true,
		status: 'APPROVED',
		rating: 4.7,
		description: 'Prawdziwa neapolitańska pizza na cienkim cieście, wypiekana w piecu opalanym drewnem.',
		generalMenu: 'Margherita, Diavola, Capricciosa, Quattro Formaggi, Calzone, domowe tiramisu.',
		latitude: 51.7670,
		longitude: 19.4600
	},
	{
		id: '3f99e8d4-50b3-469b-810d-2e21b777a83d',
		name: 'Burger Station',
		slug: 'burger-station',
		phone: '555 666 777',
		address: 'ul. Narutowicza 12',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/burgerstation',
		isActive: true,
		status: 'APPROVED',
		rating: 4.6,
		description: 'Rzemieślnicze burgery ze 100% wołowiny, świeże warzywa i autorskie sosy.',
		generalMenu: 'Classic Burger, Bacon Cheese, BBQ Beast, Spicy Jalapeno, Wege Burger z ciecierzycy, frytki belgijskie.',
		latitude: 51.7710,
		longitude: 19.4610
	},
	{
		id: 'a3f5a34e-862d-45db-9ff3-9f5fe81da96e',
		name: 'Noodle Bar',
		slug: 'noodle-bar',
		phone: '333 444 555',
		address: 'ul. Zachodnia 88',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/noodlebar',
		isActive: true,
		status: 'APPROVED',
		rating: 4.5,
		description: 'Szybkie i aromatyczne dania kuchni azjatyckiej, przygotowywane w woku na Twoich oczach.',
		generalMenu: 'Pad Thai, Noodle w sosie teriyaki, Udon z wołowiną, sajgonki warzywne, zupa Tom Yum.',
		latitude: 51.7730,
		longitude: 19.4520
	},
	{
		id: '5bb182f4-7f28-4995-bb02-98448ec6dc6a',
		name: 'Karczma Polska',
		slug: 'karczma-polska',
		phone: '222 333 444',
		address: 'ul. Gdańska 34',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/karczmapolska',
		isActive: true,
		status: 'APPROVED',
		rating: 4.9,
		description: 'Tradycyjna kuchnia polska w nowoczesnym wydaniu. Poczuj się jak u mamy.',
		generalMenu: 'Kotlet schabowy, pierogi ruskie i z mięsem, żurek staropolski na domowym zakwasie, placki ziemniaczane.',
		latitude: 51.7700,
		longitude: 19.4500
	},
	{
		id: '81d4b2e8-c26c-48c9-95a2-9721757821ef',
		name: 'Sushi Rolls',
		slug: 'sushi-rolls',
		phone: '777 888 999',
		address: 'ul. Kościuszki 15',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/sushirolls',
		isActive: true,
		status: 'APPROVED',
		rating: 4.7,
		description: 'Najwyższej jakości ryby i owoce morza w połączeniu z idealnie ugotowanym ryżem i fantazją sushimastera.',
		generalMenu: 'Zestawy maki i nigiri, California Rolls, Futomaki z łososiem, zupa miso, tatar z tuńczyka.',
		latitude: 51.7650,
		longitude: 19.4540
	},
	{
		id: 'restaurant-borowianka-uuid-1111',
		name: 'Borowianka',
		slug: 'borowianka',
		phone: '601 202 303',
		address: 'ul. Leśna 5',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/borowianka',
		isActive: true,
		status: 'APPROVED',
		rating: 4.8,
		description: 'Leśna oaza smaku w sercu miasta. Specjalizujemy się w daniach z dziczyzny, grzybów leśnych oraz tradycyjnych polskich specjałów.',
		generalMenu: 'Gulasz z dzika, zupa grzybowa z prawdziwków, pierogi z kapustą i leśnymi borowikami.',
		userId: 'owner-borowianka-uuid-1111',
		latitude: 51.7500,
		longitude: 19.4400
	},
	{
		id: 'restaurant-lochowianka-uuid-2222',
		name: 'Lochowianka',
		slug: 'lochowianka',
		phone: '701 303 404',
		address: 'ul. Wiejska 14',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/lochowianka',
		isActive: true,
		status: 'APPROVED',
		rating: 4.6,
		description: 'Karczma o niepowtarzalnym klimacie. Serwujemy autentyczne staropolskie pieczenie, pieczonego dzika oraz domowy, chrupiący chleb.',
		generalMenu: 'Pieczeń wieprzowa w sosie własnym, domowy żurek w chlebie, kaczka pieczona z jabłkami.',
		userId: 'owner-lochowianka-uuid-2222',
		latitude: 51.7450,
		longitude: 19.4350
	},
	{
		id: 'restaurant-hustawka-uuid-3333',
		name: 'Huśtawka',
		slug: 'hustawka',
		phone: '801 404 505',
		address: 'ul. Ogrodowa 18',
		city: 'Łódź',
		facebookUrl: 'https://www.facebook.com/hustawka',
		isActive: true,
		status: 'APPROVED',
		rating: 4.9,
		description: 'Nowoczesna kawiarnia i bistro z unikalnym wnętrzem pełnym huśtawek. Idealne miejsce na aromatyczną kawę, świeże gofry i pyszne desery.',
		generalMenu: 'Gofry bąbelkowe, rzemieślnicze lody, tarta cytrynowa, alternatywne metody parzenia kawy.',
		userId: 'owner-hustawka-uuid-3333',
		latitude: 51.7780,
		longitude: 19.4480
	}
]

export const MOCK_DISHES: Record<string, MockDish> = {
	'7a1a6b0c-99fa-4785-b82b-5813f8c8715a': {
		name: 'Wegańskie curry z ciecierzycą & Krem z pieczonej dyni',
		description: 'Pyszne, rozgrzewające wegańskie curry z ciecierzycą, warzywami i mleczkiem kokosowym serwowane z puszystym ryżem jaśminowym. W zestawie aksamitny krem z dyni hokkaido z nutą imbiru i prażonymi pestkami dyni. Idealny i pożywny lunch!',
		price: 34.00,
		imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/zielonamiska/posts/101',
		sourcePostId: 'fb_post_zielona_101'
	},
	'c0a2f4a4-436d-4952-bdae-e962bbcf33d9': {
		name: 'Pizza Diavola z pieca opalanego drewnem',
		description: 'Tradycyjna włoska pizza na cienkim, dojrzewającym cieście. Sos z pomidorów San Marzano DOP, świeża mozzarella fior di latte, pikantne włoskie salami ventricina, czarne oliwki leccino oraz świeża bazylia i aromatyczna oliwa peperoncino.',
		price: 38.00,
		imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/bellapizza/posts/202',
		sourcePostId: 'fb_post_bella_202'
	},
	'3f99e8d4-50b3-469b-810d-2e21b777a83d': {
		name: 'Bacon Cheese Burger & Frytki belgijskie',
		description: 'Soczysty burger z sezonowanej wołowiny premium (200g), chrupiący grillowany bekon, podwójny ser cheddar, piklowany ogórek, czerwona cebula, świeża sałata i nasz sekretny sos rzemieślniczy. W zestawie z chrupiącymi frytkami belgijskimi i domowym czosnkowym aioli.',
		price: 42.00,
		imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/burgerstation/posts/303',
		sourcePostId: 'fb_post_burger_303'
	},
	'a3f5a34e-862d-45db-9ff3-9f5fe81da96e': {
		name: 'Pad Thai z kurczakiem i chrupiącym tofu',
		description: 'Klasyczny, autentyczny Pad Thai z makaronem ryżowym smażonym w głębokim woku ze świeżym kurczakiem, kawałkami tofu, jajkiem, chrupiącymi kiełkami fasoli mung, szczypiorkiem i unikalnym sosem na bazie tamaryndowca. Podawany z ćwiartką limonki i drobno kruszonymi orzeszkami ziemnymi.',
		price: 36.00,
		imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/noodlebar/posts/404',
		sourcePostId: 'fb_post_noodle_404'
	},
	'5bb182f4-7f28-4995-bb02-98448ec6dc6a': {
		name: 'Tradycyjny Kotlet Schabowy z masełkiem koperkowym',
		description: 'Chrupiący, rozbijany ręcznie kotlet schabowy smażony na smalcu według tradycyjnej receptury. Podawany z młodymi ziemniaczkami obficie posypanymi świeżym koperkiem oraz domową zasmażaną kapustą z kminkiem. Smak tradycyjnego niedzielnego obiadu każdego dnia.',
		price: 35.00,
		imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/karczmapolska/posts/505',
		sourcePostId: 'fb_post_karczma_505'
	},
	'81d4b2e8-c26c-48c9-95a2-9721757821ef': {
		name: 'Zestaw Lunch Sushi (12 sztuk)',
		description: 'Wyjątkowy zestaw sushi przygotowywany na świeżo. Zawiera: 6 sztuk futomaków z grillowanym łososiem, kremowym serkiem Philadelphia, ogórkiem i sosem kabayaki, 4 sztuki California roll z chrupiącą krewetką w tempurze obtoczone w sezamie, oraz 2 sztuki klasycznego nigiri z tuńczykiem. W zestawie wasabi, imbir oraz sos sojowy.',
		price: 49.00,
		imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/sushirolls/posts/606',
		sourcePostId: 'fb_post_sushi_606'
	},
	'restaurant-borowianka-uuid-1111': {
		name: 'Pieczeń z dzika w sosie borowikowym',
		description: 'Wyśmienita pieczeń z szynki dzika, wolno duszona w aromatycznym, kremowym sosie z borowików leśnych zbieranych o świcie. Podawana z kopytkami domowej roboty oraz buraczkami na ciepło.',
		price: 48.00,
		imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/borowianka/posts/101',
		sourcePostId: 'fb_post_borowianka_101'
	},
	'restaurant-lochowianka-uuid-2222': {
		name: 'Tradycyjny kociołek myśliwski',
		description: 'Gęsty, rozgrzewający kociołek z dodatkiem boczku, karkówki wieprzowej, kiełbasy jałowcowej, borowików i podgrzybków. Serwowany ze świeżo upieczonym, chrupiącym chlebem na zakwasie.',
		price: 39.00,
		imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/lochowianka/posts/101',
		sourcePostId: 'fb_post_lochowianka_101'
	},
	'restaurant-hustawka-uuid-3333': {
		name: 'Świeże gofry z owocami i bitą śmietaną',
		description: 'Puszyste i chrupiące gofry, przygotowywane według naszej autorskiej receptury. Podawane z obfitą porcją świeżych owoców sezonowych, domowym sosem malinowym i prawdziwą bitą śmietaną.',
		price: 24.00,
		imageUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&auto=format&fit=crop&q=80',
		sourceUrl: 'https://www.facebook.com/hustawka/posts/101',
		sourcePostId: 'fb_post_hustawka_101'
	}
}
