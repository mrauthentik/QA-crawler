import * as dotenv from 'dotenv';
dotenv.config();

const SERVICES = [
  { name: 'API',       url: process.env.API_URL       || 'http://localhost:3001/health' },
  { name: 'Auth',      url: process.env.AUTH_URL      || 'http://localhost:3002/health' },
  { name: 'Dashboard', url: process.env.DASHBOARD_URL || 'http://localhost:3000' },
];

const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

async function ping(name: string, url: string): Promise<void> {
  try {
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const ms = Date.now() - start;
    console.log(`✅ ${name} — ${res.status} (${ms}ms) — ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`❌ ${name} — FAILED — ${(err as Error).message}`);
  }
}

async function pingAll(): Promise<void> {
  console.log(`\n🏓 Pinging ${SERVICES.length} services...`);
  await Promise.all(SERVICES.map(s => ping(s.name, s.url)));
}

// Ping immediately on startup
pingAll();

// Then every 14 minutes
setInterval(pingAll, INTERVAL_MS);

console.log(`⏱  Keep-alive pinger started — pinging every ${INTERVAL_MS / 60000} minutes`);
