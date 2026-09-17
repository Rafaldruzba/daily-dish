import express from 'express';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const app = express();

const WIDGET_KEY = process.env.WIDGET_KEY || '';

app.get('/widget', async (_req, res) => {
  if (WIDGET_KEY && String(_req.query?.key ?? '') !== WIDGET_KEY) {
    return res.status(403).json({ error: 'Niezautoryzowany — użyj ?key=' + WIDGET_KEY });
  }

  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/daily_dish?schema=public';
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();

    // 6 zapytań — każde zwraca kolejną liczbę / stan
    const usersRes = await client.query('SELECT COUNT(*)::int as total FROM "User"');
    const visitsRes = await client.query('SELECT COALESCE(SUM(views),0)::int as total FROM "Restaurant"');
    const restaurantsRes = await client.query('SELECT COUNT(*)::int as total FROM "Restaurant" WHERE isActive = true');
    const reviewsRes = await client.query('SELECT COUNT(*)::int as total FROM "Review"');

    // 5 — próby kontaktu z CRM przez osobny client (opcjonalnie; 0 jeśli brak)
    let contactAttempts = 0;
    try {
      const crmUrl = process.env.DATABASE_URL_CRM || dbUrl;
      if (crmUrl !== dbUrl) {
        const crmClient = new Client({ connectionString: crmUrl });
        await crmClient.connect();
        const crmRes = await crmClient.query('SELECT COALESCE(SUM(contactAttempts),0)::int as total FROM "Lead"');
        if (crmRes.rows[0] && crmRes.rows[0].total !== null) contactAttempts = Number(crmRes.rows[0].total);
        await crmClient.end();
      }
    } catch {
      // Brak CRM — nie psuje odpowiedzi
    }

    const status = { name: 'BistroMapa', ready: true, version: '2026.09.17', lastUpdate: new Date().toISOString() };

    res.json({
      1: usersRes.rows[0].total,
      2: visitsRes.rows[0]?.total ?? 0,
      3: restaurantsRes.rows[0].total,
      4: reviewsRes.rows[0].total,
      5: contactAttempts,
      6: status.name,
      ready: status.ready,
      version: status.version,
      lastUpdate: status.lastUpdate
    });
  } catch (error) {
    console.error('KWGT widget error:', error);
    res.status(500).json({ error: 'Błąd pobierania danych' });
  } finally {
    await client.end();
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));
const PORT = process.env.PORT || 4004;
app.listen(PORT, () => console.log(`KWGT-api: http://localhost:${PORT}/widget?key=${WIDGET_KEY}`));
