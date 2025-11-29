// next.config.js (CommonJS)
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception during Next build:', err?.stack || err);
  throw err;
});
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // { protocol: 'https', hostname: 'storage.googleapis.com' }, // opcional
    ],
  },
};

module.exports = withNextIntl(nextConfig);
