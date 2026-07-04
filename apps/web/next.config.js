const { i18n } = require('./i18n');
/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  staticPageGenerationTimeout: 120,
};
module.exports = nextConfig;