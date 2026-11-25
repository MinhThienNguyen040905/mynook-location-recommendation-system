import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Đọc .env ở root repo vào process.env (không ghi đè biến đã có). Không cần thư viện dotenv. */
export function loadRootEnv(): void {
  const file = resolve(__dirname, '..', '..', '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.trim().replace(/^"(.*)"$/, '$1');
  }
}

loadRootEnv();

export const WEB_URL = process.env['E2E_WEB_URL'] ?? 'http://localhost:3000';
export const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3001/api';
