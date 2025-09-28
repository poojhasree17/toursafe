'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@toursafe/ui';
import { AlertTriangle, Shield, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

interface Zone {
  id: string;
  name: string;
  type: 'SAFE' | 'RESTRICTED' | 'ALERT';
  polygon_geojson: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  zones?: Zone[];
  userLocation?: [number, number];
  onLocationUpdate?: (lat: number, lng: number) => void;
  showSOS?: boolean;
  onSOSClick?: () => void;
}

export function TourSafeMap({ 
  center = [72.8347, 18.9220], // Mumbai coordinates
  zoom = 14,
  zones = [],
  userLocation,
  onLocationUpdate,
  showSOS = false,
  onSOSClick
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY || 'demo'}`,
      center: center,
      zoom: zoom,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    // Add attribution
    map.current.addControl(new maplibregl.AttributionControl({
      compact: true
    }), 'bottom-left');

    map.current.on('load', () => {
      // Add zones layer
      if (zones.length > 0) {
        addZonesToMap();
      }

      // Add user location if provided
      if (userLocation) {
        addUserMarker(userLocation[1], userLocation[0]);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (map.current && zones.length > 0) {
      addZonesToMap();
    }
  }, [zones]);

  useEffect(() => {
    if (map.current && userLocation) {
      addUserMarker(userLocation[1], userLocation[0]);
    }
  }, [userLocation]);

  const addZonesToMap = () => {
    if (!map.current) return;

    zones.forEach((zone, index) => {
      const sourceId = `zone-${zone.id}`;
      const layerId = `zone-layer-${zone.id}`;

      // Add source if it doesn't exist
      if (!map.current!.getSource(sourceId)) {
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              name: zone.name,
              type: zone.type
            },
            geometry: zone.polygon_geojson
          }
        });
      }

      // Add fill layer
      if (!map.current!.getLayer(layerId)) {
        map.current!.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': zone.type === 'SAFE' ? '#10b981' : 
                         zone.type === 'RESTRICTED' ? '#ef4444' : '#f59e0b',
            'fill-opacity': 0.2
          }
        });
      }

      // Add outline layer
      const outlineLayerId = `zone-outline-${zone.id}`;
      if (!map.current!.getLayer(outlineLayerId)) {
        map.current!.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': zone.type === 'SAFE' ? '#10b981' : 
                         zone.type === 'RESTRICTED' ? '#ef4444' : '#f59e0b',
            'line-width': 2,
            'line-opacity': 0.8
          }
        });
      }

      // Add click handler
      map.current!.on('click', layerId, (e) => {
        const properties = e.features?.[0]?.properties;
        if (properties) {
          const popup = new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${properties.name}</h3>
                <p class="text-sm text-gray-600">${properties.type} Zone</p>
              </div>
            `)
            .addTo(map.current!);
        }
      });

      // Change cursor on hover
      map.current!.on('mouseenter', layerId, () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current!.on('mouseleave', layerId, () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });
  };

  const addUserMarker = (lng: number, lat: number) => {
    if (!map.current) return;

    // Remove existing marker
    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Create custom marker element
    const markerEl = document.createElement('div');
    markerEl.className = 'user-marker';
    markerEl.style.cssText = `
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    `;

    // Add marker
    userMarker.current = new maplibregl.Marker({
      element: markerEl,
      anchor: 'center'
    })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Center map on user location
    map.current.easeTo({
      center: [lng, lat],
      duration: 1000
    });
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    // Get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        addUserMarker(longitude, latitude);
        onLocationUpdate?.(latitude, longitude);
        toast.success('Location updated');
      },
      (error) => {
        console.error('Location error:', error);
        toast.error('Failed to get location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      toast.success('Location tracking stopped');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        addUserMarker(longitude, latitude);
        onLocationUpdate?.(latitude, longitude);
      },
      (error) => {
        console.error('Location tracking error:', error);
        toast.error('Location tracking failed');
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 30000
      }
    );

    setWatchId(id);
    toast.success('Location tracking started');
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={requestLocation}
          title="Get current location"
        >
          <Navigation className="h-4 w-4" />
        </Button>
        
        <Button
          variant={watchId ? "destructive" : "secondary"}
          size="icon"
          onClick={startLocationTracking}
          title={watchId ? "Stop tracking" : "Start location tracking"}
        >
          <Shield className="h-4 w-4" />
        </Button>
      </div>

      {/* SOS Button */}
      {showSOS && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <Button
            variant="sos"
            size="sos"
            onClick={onSOSClick}
            className="sos-button shadow-lg"
          >
            <AlertTriangle className="h-8 w-8 mb-1" />
            SOS
          </Button>
        </div>
      )}

      {/* Zone Legend */}
      {zones.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
          <h4 className="font-semibold text-sm mb-2">Zone Types</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-green-500 rounded opacity-50"></div>
              Safe Zone
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-yellow-500 rounded opacity-50"></div>
              Alert Zone
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-red-500 rounded opacity-50"></div>
              Restricted
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
