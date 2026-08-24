import { createClient } from 'redis';

let redisUrl: string;

// Priority 1: Official REDIS_URL from hosting provider (e.g., Railway)
if (process.env.REDIS_URL) {
  redisUrl = process.env.REDIS_URL;
} 
// Priority 2: Fallback for environments that provide separate parts
else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  const user = process.env.REDIS_USER || '';
  const password = process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}` : '';
  const at = (user || password) ? '@' : '';
  redisUrl = `redis://${user}${password}${at}${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
} 
// Priority 3: Default for local development (e.g., local docker or redis-server)
else {
  redisUrl = 'redis://localhost:6379';
}

console.log(`[Redis] Connecting to ${redisUrl.replace(/:.*@/, ':<password>@')}...`);

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('connect', () => console.log('[Redis] Connected successfully!'));
redisClient.on('error', (err) => console.error('[Redis] Client Error', err));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('[Redis] Could not connect:', err);
  }
})();

export default redisClient;
