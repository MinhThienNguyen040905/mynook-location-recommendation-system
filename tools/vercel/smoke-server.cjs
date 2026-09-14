// Exercise the same gateway handler used by the Vercel function.
const http = require('node:http');
require('dotenv').config({ quiet: true });
if (process.env.DATABASE_URL) {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (databaseUrl.hostname.endsWith('.pooler.supabase.com')) {
    databaseUrl.port = '6543';
    process.env.DATABASE_URL = databaseUrl.toString();
  }
}
Object.assign(process.env, {
  NODE_ENV: 'production', RMQ_ENABLED: 'false', REDIS_ENABLED: 'false', DB_POOL_MAX: '1',
  AUTH_SERVICE_URL: 'http://127.0.0.1:3002',
  VENUE_SERVICE_URL: 'http://127.0.0.1:3003',
  INTERACTION_SERVICE_URL: 'http://127.0.0.1:3004',
  SEARCH_AI_SERVICE_URL: 'http://127.0.0.1:3005',
});
const { handler } = require('../../packages/serverless-api/dist/index.cjs');
const server = http.createServer((req, res) => {
  // The real NextApiResponse has these helpers; add them for startup errors.
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  handler(req, res);
});
server.listen(3101, '127.0.0.1', () => console.log('MyNook smoke API: http://127.0.0.1:3101/api'));
