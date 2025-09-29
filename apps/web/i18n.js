// Next.js 14 i18n configuration
// This is handled by next.config.js and the app directory structure

const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ta', 'hi'],
    localeDetection: false, // We'll handle this manually
  },
};
