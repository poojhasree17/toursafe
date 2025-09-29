const { i18n } = require('./i18n');

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  // Minimal configuration for development
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Disable static optimization for i18n routes
  output: 'standalone',
};

module.exports = nextConfig;