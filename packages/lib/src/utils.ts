/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing between two coordinates
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Calculate speed from two GPS points
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @param timeDiffSeconds Time difference in seconds
 * @returns Speed in m/s
 */
export function calculateSpeed(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  timeDiffSeconds: number
): number {
  if (timeDiffSeconds <= 0) return 0;
  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  return distance / timeDiffSeconds;
}

/**
 * Check if a point is within a polygon using ray casting algorithm
 * @param point [lng, lat]
 * @param polygon Array of [lng, lat] coordinates
 * @returns true if point is inside polygon
 */
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

/**
 * Generate a tourist token for API authentication
 * @param touristId UUID of the tourist
 * @returns Base64 encoded token
 */
export function generateTouristToken(touristId: string): string {
  const payload = {
    touristId,
    timestamp: Date.now(),
    type: 'tourist'
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Validate and parse tourist token
 * @param token Base64 encoded token
 * @returns Parsed payload or null if invalid
 */
export function parseTouristToken(token: string): {
  touristId: string;
  timestamp: number;
  type: string;
} | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.type === 'tourist' && payload.touristId && payload.timestamp) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format coordinates for display
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Decimal places
 * @returns Formatted coordinate string
 */
export function formatCoordinates(lat: number, lng: number, precision = 6): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Convert GeoJSON MultiPolygon to simple polygon array for UI
 * @param multiPolygon GeoJSON MultiPolygon coordinates
 * @returns Array of polygon arrays
 */
export function multiPolygonToPolygons(
  multiPolygon: number[][][][]
): number[][][][] {
  return multiPolygon; // Return the array of polygons directly
}

/**
 * Convert simple polygon to GeoJSON MultiPolygon
 * @param polygons Array of polygon coordinate arrays
 * @returns GeoJSON MultiPolygon coordinates
 */
export function polygonsToMultiPolygon(
  polygons: number[][][][]
): number[][][][] {
  return polygons; // Already a MultiPolygon array
}

/**
 * Debounce function calls
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate random UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
