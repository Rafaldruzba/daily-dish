import express from 'express';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const app = express();

/** Widget dla KWGT — 4 liczby z głównej bazy BistroMapy (daily_dish).
 *  Nie potrzebuje Prisma — proste zapytania SQL wystarczają.
 */
app.get('/widget', async (_req, res) => {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/daily_dish?schema=public';
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();

    // 1. Zarejestrowane konta
    const usersRes = await client.query('SELECT COUNT(*)::int as total FROM "User"');

    // 2. Sumowane odwiedziny (views z restauracji)
    const visitsRes = await client.query('SELECT COALESCE(SUM(views),0)::int as total FROM "Restaurant"');

    // 3. Przykładowo z poziomu CRM — jeśli chcesz, podłącz osobny Client z DATABASE_URL_CRM
    const contactAttempts = 0; // placeholder — do wypełnienia przy podłączeniu CRM

    // 4. Status aplikacji
    res.json({
      users: usersRes.rows[0].total,
      visits: visitsRes.rows[0].total,
      contactAttempts,
      status: 'BistroMapa',
      ready: true,
      version: '2026.09.17',
      lastUpdate: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('KWGT widget error:', error);
    res.status(500).json({ error: 'Błąd pobierania danych' });
  } finally {
    await client.end();
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`KWGT-api: http://localhost:${PORT}/widget`));
