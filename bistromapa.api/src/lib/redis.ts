import { createClient } from 'redis';

// Get connection config from environment variables
const redisUrl = process.env.REDIS_URL;
const host = process.env.REDIS_HOST;
const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
const password = process.env.REDIS_PASSWORD || undefined;

if (redisUrl) {
  const safeUrl = redisUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Redis] Attempting to connect using URL: ${safeUrl}...`);
} else if (host) {
  console.log(`[Redis] Attempting to connect to ${host}:${port}...`);
}

export const redisClient = redisUrl
  ? createClient({ url: redisUrl })
  : createClient({
      password: password,
      socket: {
        host: host || 'localhost',
        port: port,
      },
    });

redisClient.on('ready', () => console.log('[Redis] Connected successfully and ready to use.'));
redisClient.on('error', (err) => console.error('[Redis] Client Error', err));

redisClient.connect().catch((e) => console.error('[Redis] Connection failed', e));

export async function invalidateRestaurantCache(city: string) {
	if (!redisClient.isOpen) return
	try {
		const cleanCity = city.toLowerCase().trim()
		await redisClient.del('restaurants:all')
		await redisClient.del(`restaurants:${cleanCity}`)
		await redisClient.del(`restaurants:${city}`)
		await redisClient.del('dishes:today:all')
		await redisClient.del(`dishes:today:${cleanCity}`)
		await redisClient.del(`dishes:today:${city}`)
		console.log(`[Redis] Cache invalidated for city: ${city}`)
	} catch (err) {
		console.error('[Redis] Error during cache invalidation:', err)
	}
}

export default redisClient;
