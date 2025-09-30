'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../lib/pwa';

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}

