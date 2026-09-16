import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'
import logger from './logger.service.js'

const BUCKET_NAME = process.env.BUCKET_NAME || ''
const BUCKET_URL = process.env.BUCKET_URL || ''
const ACCESS_KEY_ID = process.env.BUCKET_ACCESS_KEY_ID || ''
const SECRET_ACCESS_KEY = process.env.BUCKET_SECRET_ACCESS_KEY || ''

// Initialize S3 Client
export const s3Client = new S3Client({
	region: 'auto',
	endpoint: BUCKET_URL || undefined,
	credentials: {
		accessKeyId: ACCESS_KEY_ID,
		secretAccessKey: SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
})

/**
 * Pobiera zdjęcie z zewnętrznego URL (np. Facebook) i przesyła je do naszego bucketu S3.
 * Zwraca publiczny URL przesyłanego zdjęcia w naszym buckecie.
 */
export async function uploadImageFromUrl(imageUrl: string, folder: string = 'scraped'): Promise<string | null> {
	if (!BUCKET_NAME || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
		console.log(
			'⚠️ [Storage Service] Brak konfiguracji bucketu S3 (BUCKET_NAME, BUCKET_ACCESS_KEY_ID lub BUCKET_SECRET_ACCESS_KEY). Pomijam upload.',
		)
		return null
	}

	if (!imageUrl || !imageUrl.startsWith('http')) {
		return null
	}

	try {
		console.log(`📡 [Storage Service] Pobieranie obrazka do uploadu S3: ${imageUrl.substring(0, 80)}...`)
		const response = await fetch(imageUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			},
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
		}

		const contentType = response.headers.get('content-type') || 'image/jpeg'
		const arrayBuffer = await response.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		// Określamy rozszerzenie pliku
		let extension = 'jpg'
		if (contentType.includes('png')) extension = 'png'
		else if (contentType.includes('webp')) extension = 'webp'
		else if (contentType.includes('gif')) extension = 'gif'

		// Generujemy unikalną nazwę pliku za pomocą hash md5 z zawartości bufora
		const hash = crypto.createHash('md5').update(buffer).digest('hex')
		const fileName = `${hash}.${extension}`
		const key = `${folder}/${fileName}`

		console.log(`📤 [Storage Service] Przesyłanie pliku ${key} (${buffer.length} bajtów) do S3...`)

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: contentType,
			// ACL: 'public-read',
		})

		await s3Client.send(command)

		// Budujemy publiczny adres URL pliku
		let publicUrl = ''
		if (BUCKET_URL) {
			// S3-compatible Railway / MinIO URL format
			// Sprawdzamy czy BUCKET_URL kończy się na slash
			const cleanUrl = BUCKET_URL.endsWith('/') ? BUCKET_URL.slice(0, -1) : BUCKET_URL
			publicUrl = `${cleanUrl}/${BUCKET_NAME}/${key}`
		} else {
			// Fallback AWS S3 URL format
			publicUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`
		}

		console.log(`✅ [Storage Service] Zdjęcie przesłane pomyślnie. Nowy URL: ${publicUrl}`)
		return publicUrl
	} catch (error: any) {
		console.error('❌ [Storage Service] Błąd podczas uploadu zdjęcia na S3:', error.message || error)
		return null
	}
}

/**
 * Przesyła zdjęcie przekazane jako bufor bezpośrednio z Express file upload.
 */
export async function uploadImageBuffer(
	buffer: Buffer,
	contentType: string,
	folder: string = 'uploads',
): Promise<string | null> {
	if (!BUCKET_NAME || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
		console.log('⚠️ [Storage Service] Brak konfiguracji bucketu S3 do bezpośredniego uploadu bufora.')
		return null
	}

	try {
		let extension = 'jpg'
		if (contentType.includes('png')) extension = 'png'
		else if (contentType.includes('webp')) extension = 'webp'
		else if (contentType.includes('gif')) extension = 'gif'

		const hash = crypto.createHash('md5').update(buffer).digest('hex')
		const fileName = `${hash}.${extension}`
		const key = `${folder}/${fileName}`

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: contentType,
		})

		await s3Client.send(command)

		let publicUrl = ''
		if (BUCKET_URL) {
			const cleanUrl = BUCKET_URL.endsWith('/') ? BUCKET_URL.slice(0, -1) : BUCKET_URL
			publicUrl = `${cleanUrl}/${BUCKET_NAME}/${key}`
		} else {
			publicUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`
		}

		return publicUrl
	} catch (error: any) {
		console.error('❌ [Storage Service] Błąd podczas bezpośredniego uploadu bufora na S3:', error.message || error)
		return null
	}
}

/**
 * Generuje tymczasowo podpisany URL (presigned URL) do pobrania/wyświetlenia obiektu z prywatnego bucketu S3.
 * Ważność linku wynosi domyślnie 24 godziny.
 */
export async function getPresignedDownloadUrl(urlOrKey: string): Promise<string> {
	if (!urlOrKey) return ''
	if (!urlOrKey.startsWith('http')) return urlOrKey

	if (!BUCKET_NAME || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
		return urlOrKey
	}

	// Sprawdzamy, czy ten URL należy do naszego bucketu S3
	if (!urlOrKey.includes(BUCKET_NAME)) {
		return urlOrKey // Link zewnętrzny, zwracamy nienaruszony
	}

	try {
		let key = ''
		if (BUCKET_URL) {
			const parts = urlOrKey.split(`/${BUCKET_NAME}/`)
			if (parts.length > 1) {
				key = parts[1]
			}
		} else {
			const parts = urlOrKey.split('.amazonaws.com/')
			if (parts.length > 1) {
				key = parts[1]
			}
		}

		if (!key) {
			const index = urlOrKey.indexOf(BUCKET_NAME)
			if (index !== -1) {
				key = urlOrKey.substring(index + BUCKET_NAME.length + 1)
			}
		}

		if (!key) return urlOrKey

		// Usunięcie ewentualnego query stringu na końcu ścieżki
		key = key.split('?')[0]

		const command = new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		})

		// Podpisujemy URL na 24 godziny (86400 sekund)
		const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 })
		return signedUrl
	} catch (error: any) {
		console.error('❌ [Storage Service] Błąd podczas generowania presigned URL:', error.message || error)
		return urlOrKey
	}
}
