/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration for development
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
};

module.exports = nextConfig;