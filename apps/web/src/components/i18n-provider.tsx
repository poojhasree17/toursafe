'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const router = useRouter();

  useEffect(() => {
    // Set initial language based on browser or localStorage
    const savedLang = localStorage.getItem('i18nextLng');
    const browserLang = navigator.language.split('-')[0];

    const supportedLangs = ['en', 'ta', 'hi'];
    const defaultLang = 'en';

    let langToUse = defaultLang;

    if (savedLang && supportedLangs.includes(savedLang)) {
      langToUse = savedLang;
    } else if (supportedLangs.includes(browserLang)) {
      langToUse = browserLang;
    }

    // Update document language
    document.documentElement.lang = langToUse;

    // Store language preference
    localStorage.setItem('i18nextLng', langToUse);
  }, []);

  return <>{children}</>;
}
