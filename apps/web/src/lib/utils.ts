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

// Tourist Safety Score calculation
export interface SafetyScoreFactors {
  locationRisk: number; // 0-1 (1 being highest risk)
  timeOfDay: number; // 0-1 (1 being most risky time)
  travelPattern: number; // 0-1 (1 being most erratic)
  recentActivity: number; // 0-1 (1 being most inactive)
  zoneCompliance: number; // 0-1 (1 being most violations)
}

export interface SafetyScoreResult {
  score: number; // 0-100 (100 being safest)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: SafetyScoreFactors;
  recommendations: string[];
}

export function calculateTouristSafetyScore(
  currentLocation: { lat: number; lng: number },
  zones: Array<{
    id: string;
    name: string;
    type: 'SAFE' | 'RESTRICTED' | 'ALERT';
    polygon_geojson: any;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentCount?: number;
  }>,
  recentPings: Array<{
    lat: number;
    lng: number;
    ts: string;
    speed?: number;
  }> = [],
  currentTime: Date = new Date()
): SafetyScoreResult {
  // Factor 1: Location Risk (based on current zone)
  const locationRisk = calculateLocationRisk(currentLocation, zones);

  // Factor 2: Time of Day Risk
  const timeOfDay = calculateTimeRisk(currentTime);

  // Factor 3: Travel Pattern Analysis
  const travelPattern = analyzeTravelPattern(recentPings);

  // Factor 4: Recent Activity Level
  const recentActivity = calculateActivityLevel(recentPings);

  // Factor 5: Zone Compliance
  const zoneCompliance = calculateZoneCompliance(currentLocation, zones, recentPings);

  // Calculate weighted score
  const factors: SafetyScoreFactors = {
    locationRisk,
    timeOfDay,
    travelPattern,
    recentActivity,
    zoneCompliance
  };

  // Weighted calculation (can be adjusted based on importance)
  const weights = {
    locationRisk: 0.3,
    timeOfDay: 0.15,
    travelPattern: 0.25,
    recentActivity: 0.2,
    zoneCompliance: 0.1
  };

  const weightedScore = Object.entries(factors).reduce((acc, [key, value]) => {
    return acc + (value * weights[key as keyof typeof weights]);
  }, 0);

  // Convert to 0-100 scale (inverted since higher risk = lower score)
  const score = Math.max(0, Math.min(100, (1 - weightedScore) * 100));

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (score >= 80) riskLevel = 'LOW';
  else if (score >= 60) riskLevel = 'MEDIUM';
  else if (score >= 40) riskLevel = 'HIGH';
  else riskLevel = 'CRITICAL';

  // Generate recommendations
  const recommendations = generateRecommendations(factors, riskLevel);

  return {
    score: Math.round(score),
    riskLevel,
    factors,
    recommendations
  };
}

function calculateLocationRisk(location: { lat: number; lng: number }, zones: any[]): number {
  // Find which zones the current location intersects with
  const intersectingZones = zones.filter(zone => {
    // Simple bounding box check first for performance
    const bbox = getBoundingBox(zone.polygon_geojson);
    if (!bbox || location.lng < bbox.minLng || location.lng > bbox.maxLng ||
        location.lat < bbox.minLat || location.lat > bbox.maxLat) {
      return false;
    }

    // For now, use simple point-in-polygon logic
    // In production, you'd use a proper geospatial library
    return isPointInZone(location, zone.polygon_geojson);
  });

  if (intersectingZones.length === 0) {
    return 0.8; // Unknown area = high risk
  }

  // Calculate risk based on zone types
  let totalRisk = 0;
  let maxRisk = 0;

  intersectingZones.forEach(zone => {
    let zoneRisk = 0;
    switch (zone.type) {
      case 'SAFE':
        zoneRisk = 0.1;
        break;
      case 'ALERT':
        zoneRisk = 0.5;
        break;
      case 'RESTRICTED':
        zoneRisk = 0.9;
        break;
      default:
        zoneRisk = 0.5;
    }

    // Adjust based on incident count and risk level
    if (zone.incidentCount && zone.incidentCount > 0) {
      zoneRisk += Math.min(0.3, zone.incidentCount * 0.05);
    }

    if (zone.riskLevel) {
      switch (zone.riskLevel) {
        case 'LOW': zoneRisk = Math.min(zoneRisk, 0.2); break;
        case 'MEDIUM': zoneRisk = Math.max(zoneRisk, 0.4); break;
        case 'HIGH': zoneRisk = Math.max(zoneRisk, 0.7); break;
        case 'CRITICAL': zoneRisk = 0.95; break;
      }
    }

    totalRisk += zoneRisk;
    maxRisk = Math.max(maxRisk, zoneRisk);
  });

  // Return the highest risk zone the tourist is in
  return Math.min(1, maxRisk);
}

function calculateTimeRisk(currentTime: Date): number {
  const hour = currentTime.getHours();

  // Higher risk during night hours and early morning
  if (hour >= 22 || hour <= 6) return 0.8;
  if (hour >= 18 && hour <= 21) return 0.6;
  if (hour >= 7 && hour <= 9) return 0.4;
  return 0.2; // Daytime is generally safer
}

function analyzeTravelPattern(pings: any[]): number {
  if (pings.length < 3) return 0.5; // Neutral if insufficient data

  // Calculate speed variance and direction changes
  const speeds = pings.map(p => p.speed || 0).filter(s => s > 0);
  const speedVariance = speeds.length > 0 ?
    speeds.reduce((acc, speed, _, arr) => {
      const mean = arr.reduce((a, b) => a + b) / arr.length;
      return acc + Math.pow(speed - mean, 2);
    }, 0) / speeds.length : 0;

  // Normalize speed variance (erratic movement = higher risk)
  const normalizedSpeedVariance = Math.min(1, speedVariance / 10);

  // Calculate direction changes
  let directionChanges = 0;
  for (let i = 2; i < pings.length; i++) {
    const bearing1 = calculateBearing(pings[i-2].lat, pings[i-2].lng, pings[i-1].lat, pings[i-1].lng);
    const bearing2 = calculateBearing(pings[i-1].lat, pings[i-1].lng, pings[i].lat, pings[i].lng);
    const change = Math.min(
      Math.abs(bearing2 - bearing1),
      360 - Math.abs(bearing2 - bearing1)
    );
    if (change > 45) directionChanges++; // Significant direction change
  }

  const directionChangeRatio = directionChanges / (pings.length - 2);

  // Combine factors
  return Math.min(1, (normalizedSpeedVariance * 0.6) + (directionChangeRatio * 0.4));
}

function calculateActivityLevel(pings: any[]): number {
  if (pings.length === 0) return 1; // No activity = high risk

  const now = Date.now();
  const recentPings = pings.filter(p => {
    const pingTime = new Date(p.ts).getTime();
    return (now - pingTime) < (15 * 60 * 1000); // Last 15 minutes
  });

  if (recentPings.length === 0) return 1; // No recent activity = high risk

  // Calculate average time between pings
  const timeDiffs = [];
  for (let i = 1; i < recentPings.length; i++) {
    const diff = new Date(recentPings[i].ts).getTime() - new Date(recentPings[i-1].ts).getTime();
    timeDiffs.push(diff);
  }

  const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  const avgMinutesBetweenPings = avgTimeDiff / (1000 * 60);

  // More than 5 minutes between pings = concerning
  return Math.min(1, avgMinutesBetweenPings / 10);
}

function calculateZoneCompliance(location: { lat: number; lng: number }, zones: any[], pings: any[]): number {
  // This would track if tourist has been entering restricted zones
  // For now, return 0 (no violations detected)
  // In a full implementation, you'd track historical zone entries
  return 0;
}

function generateRecommendations(factors: SafetyScoreFactors, riskLevel: string): string[] {
  const recommendations: string[] = [];

  if (factors.locationRisk > 0.7) {
    recommendations.push("Consider moving to a safer zone - current area has elevated risk");
  }

  if (factors.timeOfDay > 0.6) {
    recommendations.push("Be extra cautious - it's currently a high-risk time of day");
  }

  if (factors.travelPattern > 0.7) {
    recommendations.push("Your movement pattern appears erratic - consider taking a break");
  }

  if (factors.recentActivity > 0.7) {
    recommendations.push("Share your live location with emergency contacts");
  }

  if (riskLevel === 'CRITICAL') {
    recommendations.unshift("IMMEDIATE ACTION REQUIRED: Contact emergency services");
  }

  return recommendations.length > 0 ? recommendations : ["Continue normal activities - you're in a safe situation"];
}

// Helper functions
function getBoundingBox(polygon: any): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (!polygon || !polygon.coordinates) return null;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

  const processCoordinates = (coords: number[][][]) => {
    coords.forEach(ring => {
      ring.forEach(([lng, lat]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });
  };

  if (polygon.type === 'MultiPolygon') {
    polygon.coordinates.forEach((polygonCoords: number[][][]) => {
      processCoordinates(polygonCoords);
    });
  } else {
    processCoordinates(polygon.coordinates);
  }

  return { minLat, maxLat, minLng, maxLng };
}

function isPointInZone(point: { lat: number; lng: number }, polygon: any): boolean {
  // Simplified point-in-polygon check using ray casting algorithm
  // In production, use a proper geospatial library like Turf.js
  const { lat, lng } = point;

  if (!polygon || !polygon.coordinates) return false;

  let inside = false;

  const processPolygon = (coords: number[][][]) => {
    coords.forEach(ring => {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];

        if (((yi > lat) !== (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
    });
  };

  if (polygon.type === 'MultiPolygon') {
    polygon.coordinates.forEach((polygonCoords: number[][][]) => {
      processPolygon(polygonCoords);
    });
  } else {
    processPolygon(polygon.coordinates);
  }

  return inside;
}
