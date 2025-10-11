// next.config.js
const createNextIntlPlugin = require('next-intl/plugin');
// (opcional) passa o caminho do teu request config para melhor DX:
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'placehold.co' }
    ]
  }
};

module.exports = withNextIntl(nextConfig);
