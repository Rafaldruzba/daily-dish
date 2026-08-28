import { createClient } from 'redis';

// Get connection config from environment variables
const redisUrl = process.env.REDIS_URL;
const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
const password = process.env.REDIS_PASSWORD || undefined;

if (redisUrl) {
  // Obfuscate password in connection URL for safe logging
  const safeUrl = redisUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Redis] Attempting to connect using URL: ${safeUrl}...`);
} else {
  console.log(`[Redis] Attempting to connect to ${host}:${port}...`);
}

export const redisClient = redisUrl
  ? createClient({ url: redisUrl })
  : createClient({
      password: password,
      socket: {
        host: host,
        port: port,
      },
    });

redisClient.on('ready', () => console.log('[Redis] Connected successfully and ready to use.'));
redisClient.on('error', (err) => console.error('[Redis] Client Error', err));

// Connect
redisClient.connect().catch(console.error);

export default redisClient;
