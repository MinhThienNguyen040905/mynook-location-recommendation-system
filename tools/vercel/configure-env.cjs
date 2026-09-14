// Run only after `vercel link`. Values travel over stdin, never shell arguments.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const local = require('dotenv').parse(fs.readFileSync('.env'));
const secrets = ['DATABASE_URL', 'GROQ_API_KEY', 'HUGGINGFACE_API_TOKEN',
  'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'SMTP_USER', 'SMTP_PASS'];
const values = {
  NODE_ENV: 'production', NEXT_PUBLIC_API_URL: '/api', RMQ_ENABLED: 'false',
  REDIS_ENABLED: 'false', DB_POOL_MAX: '1',
  AUTH_SERVICE_URL: 'http://127.0.0.1:3002', VENUE_SERVICE_URL: 'http://127.0.0.1:3003',
  INTERACTION_SERVICE_URL: 'http://127.0.0.1:3004', SEARCH_AI_SERVICE_URL: 'http://127.0.0.1:3005',
  JWT_SECRET: randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d',
};
for (const key of [...secrets, 'CLOUDINARY_CLOUD_NAME', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM']) {
  if (local[key]) values[key] = local[key];
}
// Serverless instances must share backend connections through transaction mode.
if (values.DATABASE_URL) {
  const databaseUrl = new URL(values.DATABASE_URL);
  if (databaseUrl.hostname.endsWith('.pooler.supabase.com')) {
    databaseUrl.port = '6543';
    values.DATABASE_URL = databaseUrl.toString();
  }
}
secrets.push('JWT_SECRET', 'JWT_REFRESH_SECRET');
for (const [key, value] of Object.entries(values)) {
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--yes', 'vercel@59.16.0', 'env', 'add', key, 'production', '--yes',
      secrets.includes(key) ? '--sensitive' : '--no-sensitive'],
    { input: value, encoding: 'utf8', shell: process.platform === 'win32', windowsHide: true });
  if (result.status !== 0) {
    // Provider output may contain submitted values; report the key only.
    throw new Error(`Could not configure ${key}; inspect the Vercel environment settings.`);
  }
  console.log(`Configured ${key}`);
}
