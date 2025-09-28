import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

export function watchPosition(
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser.');
  }

  return navigator.geolocation.watchPosition(
    callback,
    errorCallback,
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 30000, // 30 seconds
    }
  );
}

export function clearWatch(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

export function getStoredVC(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('toursafe-vc');
}

export function storeVC(vcJwt: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('toursafe-vc', vcJwt);
}

export function clearStoredVC(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('toursafe-vc');
}

export function generateTouristId(): string {
  return 'tourist-' + crypto.randomUUID();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
