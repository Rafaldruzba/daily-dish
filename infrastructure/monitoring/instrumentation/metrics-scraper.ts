// Metryki scrappera - tylko dla scrapper backend (4002).
import client from 'prom-client';
import { register } from './metrics';

export const scraperJobs = new client.Counter({
  name: 'scraper_jobs_total',
  help: 'Zakończone joby scrapowania',
  labelNames: ['status'], // 'success' | 'failure'
  registers: [register],
});

export const scraperJobDuration = new client.Histogram({
  name: 'scraper_job_duration_seconds',
  help: 'Czas trwania jobu scrapowania',
  buckets: [1, 5, 15, 30, 60, 120, 300, 600],
  registers: [register],
});

export const scraperItems = new client.Counter({
  name: 'scraper_items_total',
  help: 'Liczba zescrapowanych elementów',
  registers: [register],
});

/* Użycie:
  const end = scraperJobDuration.startTimer();
  try { ...; scraperJobs.inc({ status: 'success' }); scraperItems.inc(items.length); }
  catch (e) { scraperJobs.inc({ status: 'failure' }); throw e; }
  finally { end(); }
*/
