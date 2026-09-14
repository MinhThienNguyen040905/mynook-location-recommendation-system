const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_PUBLIC_API_URL: '/api',
  NX_DAEMON: 'false',
  NX_NO_CLOUD: 'true',
};
for (const args of [
  [require.resolve('webpack-cli/bin/cli.js'), '--config', 'packages/serverless-api/webpack.config.cjs'],
  [require.resolve('next/dist/bin/next'), 'build', 'apps/web-client', '--webpack'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
