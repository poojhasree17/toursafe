'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@toursafe/ui';
import { Languages } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

export function LanguageSwitcher() {
  const router = useRouter();

  const handleLanguageChange = (langCode: string) => {
    // Store language preference
    localStorage.setItem('i18nextLng', langCode);
    document.documentElement.lang = langCode;

    // Update URL with language prefix
    const currentPath = window.location.pathname;
    const isAlreadyLocalized = /^[a-z]{2}\//.test(currentPath);

    let newPath;
    if (isAlreadyLocalized) {
      newPath = currentPath.replace(/^\/[a-z]{2}/, `/${langCode}`);
    } else {
      newPath = `/${langCode}${currentPath}`;
    }

    router.push(newPath);
  };

  // Get current language from localStorage or default to 'en'
  const currentLang = typeof window !== 'undefined'
    ? localStorage.getItem('i18nextLng') || 'en'
    : 'en';

  return (
    <div className="relative group">
      <Button variant="ghost" size="sm" className="flex items-center space-x-1">
        <Languages className="h-4 w-4" />
        <span className="text-sm">
          {languages.find(lang => lang.code === currentLang)?.flag}
        </span>
      </Button>

      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[120px]">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 ${
              currentLang === language.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
