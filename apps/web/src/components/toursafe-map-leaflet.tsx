'use client';

import { useEffect, useRef, useState, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@toursafe/ui';
import { AlertTriangle, Shield, Navigation, Layers, Satellite, Map as MapIcon } from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
let DefaultIcon: any;
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });
  DefaultIcon = L.Icon.Default;
}

interface Zone {
  id: string;
  name: string;
  type: 'SAFE' | 'RESTRICTED' | 'ALERT';
  polygon_geojson: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
  description?: string;
  lastUpdated?: string;
  incidentCount?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  zones?: Zone[];
  userLocation?: [number, number];
  onLocationUpdate?: (lat: number, lng: number, accuracy?: number, speed?: number) => void;
  showSOS?: boolean;
  onSOSClick?: () => void;
  isTracking?: boolean;
  onTrackingToggle?: () => void;
  onZoneSelect?: (zone: Zone) => void;
  mapStyle?: 'streets' | 'satellite' | 'terrain';
  onMapStyleChange?: (style: 'streets' | 'satellite' | 'terrain') => void;
}

// Zone colors for different types
const zoneColors = {
  SAFE: '#10b981',      // Green
  ALERT: '#f59e0b',     // Yellow
  RESTRICTED: '#ef4444' // Red
};

const zoneOpacity = {
  SAFE: 0.3,
  ALERT: 0.4,
  RESTRICTED: 0.5
};

// Custom marker icon for user location
const createUserIcon = () => {
  if (typeof window !== 'undefined') {
    const L = require('leaflet');
    return new L.Icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="#ffffff" stroke-width="4"/>
          <circle cx="12" cy="12" r="6" fill="#ffffff"/>
        </svg>
      `),
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }
  return DefaultIcon;
};

function ZonePolygon({ zone, onZoneSelect }: { zone: Zone; onZoneSelect?: (zone: Zone) => void }) {
  // Convert GeoJSON coordinates to Leaflet format
  // Handle MultiPolygon structure properly
  const coordinates = zone.polygon_geojson.coordinates;
  const positions: [number, number][][] = [];

  if (coordinates && coordinates.length > 0) {
    // For MultiPolygon, coordinates[0] is the first polygon
    const polygonCoords = coordinates[0];
    if (polygonCoords && polygonCoords.length > 0) {
      // Convert each ring (first ring is outer, others are holes)
      polygonCoords.forEach((ring: number[][]) => {
        const ringPositions: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);
        positions.push(ringPositions);
      });
    }
  }

  const color = zoneColors[zone.type] || '#6b7280';
  const opacity = zoneOpacity[zone.type] || 0.3;

  if (positions.length === 0) {
    return null;
  }

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: opacity,
        weight: 2
      }}
      eventHandlers={{
        click: () => onZoneSelect?.(zone)
      }}
    />
  );
}

function SOSButton({ onSOSClick, showSOS }: { onSOSClick?: () => void; showSOS?: boolean }) {
  if (!showSOS) return null;

  return (
    <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-auto">
      <Button
        variant="destructive"
        size="lg"
        onClick={() => {
          console.log('🆘 SOS Button clicked!');
          onSOSClick?.();
        }}
        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-8 rounded-full shadow-2xl border-2 border-red-400 animate-pulse hover:animate-none transition-all duration-300"
        title="Emergency SOS - Click to send emergency alert"
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <AlertTriangle className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
          <span className="text-lg font-bold">SOS</span>
        </div>
      </Button>
    </div>
  );
}

export const TourSafeMap = forwardRef<any, MapProps>(function TourSafeMap({
  center = [18.9220, 72.8347], // Mumbai coordinates [lat, lng]
  zoom = 14,
  zones = [],
  userLocation,
  onLocationUpdate,
  showSOS = false,
  onSOSClick,
  isTracking = false,
  onTrackingToggle,
  onZoneSelect,
  mapStyle = 'streets',
  onMapStyleChange
}, ref) {
  const mapRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (userLocation && mapRef.current) {
      const map = mapRef.current;
      map.setView([userLocation[0], userLocation[1]], zoom);
    }
  }, [userLocation, zoom]);

  // Get tile layer URL based on map style
  const getTileLayer = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getAttribution = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      case 'terrain':
        return 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        onLocationUpdate?.(latitude, longitude, accuracy, speed || undefined);
        toast.success('Location updated');
      },
      (error) => {
        console.error('Location error:', error);
        toast.error(`Failed to get location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  };

  if (!isClient) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => setMapLoaded(true)}
      >
        <TileLayer
          url={getTileLayer()}
          attribution={getAttribution()}
        />

        {/* Render safety zones */}
        {zones.map((zone) => {
          console.log('Rendering zone:', zone.name, zone.polygon_geojson.coordinates);
          return (
            <ZonePolygon
              key={zone.id}
              zone={zone}
              onZoneSelect={onZoneSelect}
            />
          );
        })}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation[0], userLocation[1]]}
            icon={createUserIcon()}
          >
            <Popup>
              <div className="p-2">
                <p className="font-semibold">Your Location</p>
                <p className="text-sm text-gray-600">
                  {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={requestLocation}
          title="Get current location"
          className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-white/20"
        >
          <Navigation className="h-4 w-4 text-blue-600" />
        </Button>

        <Button
          variant={isTracking ? "destructive" : "secondary"}
          size="icon"
          onClick={onTrackingToggle}
          title={isTracking ? "Stop tracking" : "Start location tracking"}
          className={`backdrop-blur-sm shadow-lg border border-white/20 transition-all duration-200 ${
            isTracking ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-white/90 hover:bg-white'
          }`}
        >
          <Shield className={`h-4 w-4 ${isTracking ? 'text-white' : 'text-green-600'}`} />
        </Button>

        {/* Emergency SOS Button in Controls */}
        <Button
          variant="destructive"
          size="icon"
          onClick={() => {
            console.log('🆘 SOS Icon Button clicked!');
            onSOSClick?.();
          }}
          title="Emergency SOS Alert"
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg border border-red-400 animate-pulse"
        >
          <AlertTriangle className="h-4 w-4 text-white" />
        </Button>
      </div>

      {/* Map Style Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-1 shadow-lg border border-white/20">
          <div className="flex space-x-1">
            {[
              { key: 'streets', icon: MapIcon, label: 'Streets' },
              { key: 'satellite', icon: Satellite, label: 'Satellite' },
              { key: 'terrain', icon: Layers, label: 'Terrain' }
            ].map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                variant={mapStyle === key ? "default" : "ghost"}
                size="sm"
                onClick={() => onMapStyleChange?.(key as 'streets' | 'satellite' | 'terrain')}
                className={`h-8 px-2 ${mapStyle === key ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* SOS Button - Conditionally visible for safety */}
      <SOSButton onSOSClick={onSOSClick} showSOS={showSOS} />

      {/* Compact Zone Legend - Top Right */}
      {zones.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg border border-white/20">
          <div className="flex items-center gap-3">
            {[
              { type: 'SAFE', color: 'bg-emerald-500', textColor: 'text-emerald-600', label: 'Safe', count: zones.filter(z => z.type === 'SAFE').length },
              { type: 'ALERT', color: 'bg-amber-500', textColor: 'text-amber-600', label: 'Alert', count: zones.filter(z => z.type === 'ALERT').length },
              { type: 'RESTRICTED', color: 'bg-red-500', textColor: 'text-red-600', label: 'Restricted', count: zones.filter(z => z.type === 'RESTRICTED').length }
            ].map(({ type, color, textColor, label, count }) => (
              <div key={type} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 ${color} rounded shadow-sm`}></div>
                <span className="font-medium text-gray-700">{label}</span>
                <span className={`font-bold ${textColor}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
