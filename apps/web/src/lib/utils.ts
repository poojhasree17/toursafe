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

export function formatCoordinates(lat: number, lng: number, precision: number = 6): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
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

// Geographic utility functions
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);

  const θ = Math.atan2(y, x);

  return (θ*180/Math.PI + 360) % 360; // in degrees
}

export function calculateSpeed(lat1: number, lon1: number, lat2: number, lon2: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0;
  
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance / timeSeconds; // metres per second
}

export function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// Tourist token utilities
export function generateTouristToken(touristId: string): string {
  const payload = {
    touristId,
    type: 'tourist',
    timestamp: Date.now()
  };
  
  return btoa(JSON.stringify(payload));
}

export function parseTouristToken(token: string): { touristId: string; type: string; timestamp: number } | null {
  try {
    const decoded = atob(token);
    const payload = JSON.parse(decoded);
    
    if (payload.touristId && payload.type === 'tourist' && payload.timestamp) {
      return payload;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
