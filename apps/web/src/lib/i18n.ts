// Simple i18n utilities for Next.js 14
export const supportedLocales = ['en', 'ta', 'hi'];
export const defaultLocale = 'en';

// Helper function to get current language
export function getCurrentLanguage(): string {
  if (typeof window === 'undefined') return defaultLocale;

  const saved = localStorage.getItem('i18nextLng');
  return saved && supportedLocales.includes(saved) ? saved : defaultLocale;
}

// Helper function to set language
export function setLanguage(lang: string): void {
  if (typeof window !== 'undefined' && supportedLocales.includes(lang)) {
    localStorage.setItem('i18nextLng', lang);
    document.documentElement.lang = lang;
  }
}
