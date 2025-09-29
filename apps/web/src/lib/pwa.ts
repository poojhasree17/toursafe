export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);

          // Register for background sync
          if ('sync' in window.ServiceWorkerRegistration.prototype) {
            (registration as any).sync.register('background-sync');
          }
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

export function isPWAInstalled(): boolean {
  return typeof window !== 'undefined' &&
         (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true);
}

export function getPWADisplayMode(): string {
  if (typeof window !== 'undefined') {
    return (window.matchMedia('(display-mode: standalone)').matches && 'standalone') ||
           ((window.navigator as any).standalone === true && 'standalone') ||
           'browser';
  }
  return 'browser';
}
