// Metryki użytkowników - tylko dla backend i backend-console.
import client from 'prom-client';
import { register } from './metrics';

// === PODEPNIJ POD SWOJĄ BAZĘ / REDIS ===
async function countUsers(): Promise<number> {
  // np. Prisma:  return prisma.user.count();
  // np. pg:      return (await pool.query('SELECT count(*)::int AS c FROM users')).rows[0].c;
  throw new Error('TODO: countUsers');
}

async function countActiveUsers(windowMs = 5 * 60 * 1000): Promise<number> {
  // Aktywni = użytkownicy z requestem w ostatnich 5 min.
  // np. Redis:
  //   await redis.zremrangebyscore('metrics:active_users', 0, Date.now() - windowMs);
  //   return redis.zcard('metrics:active_users');
  throw new Error('TODO: countActiveUsers');
}

// Wywołaj w middleware po uwierzytelnieniu requestu:
export function trackActiveUser(userId: string) {
  // redis.zadd('metrics:active_users', Date.now(), userId);
}
// =======================================

export const usersTotal = new client.Gauge({
  name: 'app_users_total',
  help: 'Liczba zarejestrowanych użytkowników',
  registers: [register],
  async collect() {
    try { this.set(await countUsers()); } catch { /* zostaw ostatnią wartość */ }
  },
});

export const activeUsers = new client.Gauge({
  name: 'app_active_users',
  help: 'Użytkownicy aktywni w ostatnich 5 minutach',
  registers: [register],
  async collect() {
    try { this.set(await countActiveUsers()); } catch { /* j.w. */ }
  },
});

export const registrations = new client.Counter({
  name: 'app_user_registrations_total',
  help: 'Nowe rejestracje',
  registers: [register],
});

export const logins = new client.Counter({
  name: 'app_user_logins_total',
  help: 'Próby logowania',
  labelNames: ['result'], // 'success' | 'failure'
  registers: [register],
});

// Użycie: registrations.inc();  logins.inc({ result: 'success' });
