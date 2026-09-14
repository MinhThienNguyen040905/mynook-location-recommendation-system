//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });


/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  serverExternalPackages: ['@mynook/serverless-api'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  webpack(config, { isServer }) {
    // Workspace symlinks resolve outside node_modules. Keep the precompiled
    // Nest bundle external so Next does not bundle optional Nest transports.
    if (isServer) {
      config.externals = [
        { '@mynook/serverless-api': 'commonjs @mynook/serverless-api' },
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
      ];
    }
    return config;
  },

  // Allow next/image to load from external domains used in mock data
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);

