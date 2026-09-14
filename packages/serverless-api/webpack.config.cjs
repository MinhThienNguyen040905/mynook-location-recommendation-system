const path = require('node:path');
const fs = require('node:fs');
const nodeExternals = require('webpack-node-externals');
const root = path.resolve(__dirname, '../..');
const aliases = {};
for (const name of fs.readdirSync(path.join(root, 'libs'))) {
  aliases[`@mynook/${name}`] = path.join(root, 'libs', name, 'src/index.ts');
}

module.exports = {
  mode: 'production',
  target: 'node22',
  entry: path.join(__dirname, 'src/index.ts'),
  output: { path: path.join(__dirname, 'dist'), filename: 'index.cjs', library: { type: 'commonjs2' }, clean: true },
  externalsPresets: { node: true },
  externals: [nodeExternals({ modulesDir: path.join(root, 'node_modules'), allowlist: [/^@mynook\//] })],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    extensionAlias: { '.js': ['.ts', '.js'] },
    alias: aliases,
  },
  module: { rules: [{ test: /\.ts$/, exclude: /node_modules/, use: { loader: 'ts-loader', options: { transpileOnly: true, configFile: path.join(__dirname, 'tsconfig.json') } } }] },
  optimization: { minimize: false },
};
