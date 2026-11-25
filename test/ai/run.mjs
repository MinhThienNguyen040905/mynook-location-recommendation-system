// Chạy bộ test AI hai lượt (spec 018): bình thường, rồi lượt "AI lỗi" (E2E_AI_FAILURE=1).
// Dùng: npm run test:ai [-- <tham số playwright>]   — vd: npm run test:ai -- --grep @groq
import { spawnSync } from 'node:child_process';

const extra = process.argv.slice(2);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (label, env) => {
  console.log(`\n━━━ ${label} ━━━`);
  const r = spawnSync(npx, ['playwright', 'test', '-c', 'test/playwright.ai.config.ts', ...extra], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  return r.status ?? 1;
};

const normal = run('Lượt 1 — model thật', { E2E_AI_FAILURE: '' });
const failure = process.env.E2E_AI_SKIP_FAILURE === '1' ? 0 : run('Lượt 2 — AI lỗi (AC-3.3)', { E2E_AI_FAILURE: '1' });
console.log(`\nKết quả: lượt 1 ${normal === 0 ? 'PASS' : 'FAIL'}, lượt 2 ${failure === 0 ? 'PASS' : 'FAIL'}`);
process.exit(normal || failure);
