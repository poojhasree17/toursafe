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
}

export function TourSafeMap({
  center = [72.8347, 18.9220], // Mumbai coordinates
  zoom = 14,
  zones = [],
  userLocation,
  onLocationUpdate,
  showSOS = false,
  onSOSClick,
  isTracking = false,
  onTrackingToggle,
  onZoneSelect,
  mapStyle = 'streets'
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Get map style URL or object based on selection
  const getMapStyle = () => {
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    
    // Use free OpenStreetMap style if no API key
    if (!apiKey || apiKey === 'demo') {
      console.log('ℹ️ Using free OpenStreetMap tiles (no API key required)');
      // Return a complete OSM style configuration
      return {
        version: 8 as const,
        name: 'OpenStreetMap',
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster' as const,
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster' as const,
            source: 'osm',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      };
    }

    // Use MapTiler if API key is available
    const baseUrl = `https://api.maptiler.com/maps`;
    try {
      switch (mapStyle) {
        case 'satellite':
          return `${baseUrl}/satellite/style.json?key=${apiKey}`;
        case 'terrain':
          return `${baseUrl}/terrain/style.json?key=${apiKey}`;
        default:
          return `${baseUrl}/streets-v2/style.json?key=${apiKey}`;
      }
    } catch (error) {
      console.warn('MapTiler style failed, using OSM fallback:', error);
      return {
        version: 8 as const,
        name: 'OpenStreetMap',
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster' as const,
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster' as const,
            source: 'osm',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      };
    }
  };

  // Track when component is mounted
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    // Don't initialize if component not mounted or already loaded or error occurred
    if (!isMounted || mapLoaded || mapError) return;

    let retryCount = 0;
    const maxRetries = 10;

    // Add a small delay to ensure the DOM is fully ready
    const initMap = () => {
      console.log('🔄 Attempting to initialize map, attempt:', retryCount + 1);
      console.log('🏷️ isMounted:', isMounted);
      console.log('📦 mapContainer.current exists:', !!mapContainer.current);

      // Check if container exists
      if (!mapContainer.current) {
        console.error('❌ Map container not found, retrying...', retryCount + 1);
        retryCount++;

        if (retryCount < maxRetries) {
          // Retry after a short delay with exponential backoff
          setTimeout(initMap, 50 * retryCount);
          return;
        } else {
          console.error('❌ Max retries reached, map container not found');
          setMapError('Map container not found after multiple attempts');
          return;
        }
      }

      console.log('🚀 Initializing map with style:', getMapStyle());
      console.log('📦 Container element:', mapContainer.current);
      console.log('🔍 Container children:', mapContainer.current.children.length);

      try {
        // Initialize map
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: getMapStyle(),
          center: center,
          zoom: zoom,
          attributionControl: false
        });

        console.log('✅ Map instance created successfully');
      } catch (error) {
        console.error('❌ Failed to initialize map:', error);
        setMapError(`Map initialization failed: ${error}`);
      }
    };

    // Use a longer timeout to ensure DOM is fully ready
    setTimeout(initMap, 200);

    return () => {
      if (map.current) {
        console.log('🧹 Cleaning up map instance');
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapStyle, center, zoom, isMounted, mapError, mapLoaded]);

  // Separate useEffect for map controls and event listeners
  useEffect(() => {
    if (!map.current || mapLoaded) return;

    console.log('🎛️ Adding map controls and event listeners');

    try {
      // Add enhanced navigation controls
      map.current.addControl(new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
      }), 'top-right');

      // Add attribution
      map.current.addControl(new maplibregl.AttributionControl({
        compact: true
      }), 'bottom-left');

      const handleMapLoad = () => {
        console.log('✅ Map loaded successfully');
        setMapLoaded(true);
        setMapError(null);
        // Add zones layer
        if (zones.length > 0) {
          addZonesToMap();
        }

        // Add user location if provided
        if (userLocation) {
          addUserMarker(userLocation[1], userLocation[0]);
        }
      };

      const handleMapError = (e: any) => {
        console.error('❌ Map failed to load:', e);
        setMapError(`Failed to load map: ${e.error?.message || 'Unknown error'}`);
        toast.error('Failed to load map. Check console for details.');
      };

      map.current.on('load', handleMapLoad);
      map.current.on('error', handleMapError);

      return () => {
        if (map.current) {
          map.current.off('load', handleMapLoad);
          map.current.off('error', handleMapError);
        }
      };
    } catch (error) {
      console.error('❌ Failed to add map controls:', error);
      setMapError(`Failed to add map controls: ${error}`);
    }
  }, [map.current, mapLoaded, zones, userLocation]);

  // Retry adding zones and markers when map becomes ready
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded() && !mapLoaded) {
      console.log('🔄 Map ready, adding zones and markers');
      if (zones.length > 0) {
        addZonesToMap();
      }
      if (userLocation) {
        addUserMarker(userLocation[1], userLocation[0]);
      }
    }
  }, [mapLoaded, zones, userLocation]);

  // Update map style when it changes
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      map.current.setStyle(getMapStyle());
    }
  }, [mapStyle]);


  const addZonesToMap = () => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('⏳ Map not ready for zones, will retry when loaded');
      return;
    }

    // Clear existing zone layers
    zones.forEach((zone) => {
      const sourceId = `zone-${zone.id}`;
      const layerId = `zone-layer-${zone.id}`;
      const outlineLayerId = `zone-outline-${zone.id}`;

      if (map.current!.getLayer(outlineLayerId)) {
        map.current!.removeLayer(outlineLayerId);
      }
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    zones.forEach((zone, index) => {
      const sourceId = `zone-${zone.id}`;
      const layerId = `zone-layer-${zone.id}`;

      // Add source
      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            name: zone.name,
            type: zone.type,
            description: zone.description,
            riskLevel: zone.riskLevel,
            incidentCount: zone.incidentCount,
            id: zone.id
          },
          geometry: zone.polygon_geojson
        }
      });

      // Enhanced fill layer with animations
      map.current!.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': zone.type === 'SAFE' ? '#10b981' :
                       zone.type === 'RESTRICTED' ? '#ef4444' : '#f59e0b',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.4,
            0.25
          ] as any
        }
      });

      // Enhanced outline layer
      const outlineLayerId = `zone-outline-${zone.id}`;
      map.current!.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': zone.type === 'SAFE' ? '#059669' :
                       zone.type === 'RESTRICTED' ? '#dc2626' : '#d97706',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            4,
            2
          ] as any,
          'line-opacity': 0.9
        }
      });

      // Enhanced click handler with detailed popup
      map.current!.on('click', layerId, (e) => {
        const properties = e.features?.[0]?.properties;
        if (properties) {
          const zone = zones.find(z => z.id === properties.id);
          if (zone && onZoneSelect) {
            onZoneSelect(zone);
          }

          const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '300px'
          })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-3">
                <div class="flex items-center mb-2">
                  <div class="w-3 h-3 rounded-full mr-2 ${
                    properties.type === 'SAFE' ? 'bg-green-500' :
                    properties.type === 'RESTRICTED' ? 'bg-red-500' : 'bg-yellow-500'
                  }"></div>
                  <h3 class="font-semibold text-base">${properties.name}</h3>
                </div>
                <div class="mb-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    properties.type === 'SAFE' ? 'bg-green-100 text-green-800' :
                    properties.type === 'RESTRICTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }">
                    ${properties.type} Zone
                  </span>
                </div>
                ${properties.description ? `<p class="text-sm text-gray-600 mb-2">${properties.description}</p>` : ''}
                <div class="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>Risk: ${properties.riskLevel || 'Unknown'}</div>
                  <div>Incidents: ${properties.incidentCount || 0}</div>
                </div>
              </div>
            `)
            .addTo(map.current!);
        }
      });

      // Enhanced hover effects
      let hoveredStateId: string | number | undefined = undefined;

      map.current!.on('mouseenter', layerId, (e) => {
        if (e.features && e.features.length > 0) {
          hoveredStateId = e.features[0].id;
          if (hoveredStateId !== undefined) {
            map.current!.setFeatureState(
              { source: sourceId, id: hoveredStateId },
              { hover: true }
            );
          }
        }
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current!.on('mouseleave', layerId, () => {
        if (hoveredStateId !== undefined) {
          map.current!.setFeatureState(
            { source: sourceId, id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = undefined;
        map.current!.getCanvas().style.cursor = '';
      });
    });
  };

  const addUserMarker = (lng: number, lat: number) => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('⏳ Map not ready for user marker, will retry when loaded');
      return;
    }

    // Remove existing marker
    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Create enhanced marker element
    const markerEl = document.createElement('div');
    markerEl.className = 'user-marker-enhanced';
    markerEl.style.cssText = `
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0,0,0,0.2);
      position: relative;
      animation: pulse-enhanced 2s infinite;
    `;

    // Add inner pulse effect
    const pulseEl = document.createElement('div');
    pulseEl.style.cssText = `
      position: absolute;
      top: -8px;
      left: -8px;
      width: 40px;
      height: 40px;
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-radius: 50%;
      animation: pulse-ring 2s infinite;
    `;

    markerEl.appendChild(pulseEl);

    // Add marker
    userMarker.current = new maplibregl.Marker({
      element: markerEl,
      anchor: 'center'
    })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Center map on user location with smooth animation
    map.current.easeTo({
      center: [lng, lat],
      duration: 1500,
      padding: { bottom: 200 } // Account for bottom panel
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
        const { latitude, longitude, accuracy, speed } = position.coords;
        console.log('📍 Manual location update:', { latitude, longitude, accuracy, speed });
        addUserMarker(longitude, latitude);
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
        maximumAge: 30000 // 30 seconds cache
      }
    );
  };

  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
      {/* Map Container - Always rendered */}
      <div
        ref={mapContainer}
        className="maplibregl-map w-full h-full"
        style={{
          minHeight: '400px',
          position: 'relative',
          backgroundColor: '#f3f4f6'
        }}
        id="tour-safe-map"
      />

      {/* Loading Overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-50">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Map Loading Error</h3>
            <p className="text-red-700 mb-4">{mapError}</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Possible solutions:</p>
              <ul className="text-sm text-gray-600 text-left space-y-1">
                <li>• Check your internet connection</li>
                <li>• Verify MapTiler API key is configured</li>
                <li>• Try refreshing the page</li>
                <li>• Check browser console for details</li>
              </ul>
            </div>
            <Button
              variant="default"
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Reload Page
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Map Controls */}
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
      </div>

      {/* Enhanced SOS Button */}
      {showSOS && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            variant="destructive"
            size="lg"
            onClick={onSOSClick}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-8 rounded-full shadow-2xl border-2 border-red-400 animate-pulse hover:animate-none transition-all duration-300"
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
      )}

      {/* Enhanced Zone Legend */}
      {zones.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/20">
          <h4 className="font-bold text-sm mb-3 text-gray-900">Safety Zones</h4>
          <div className="space-y-2">
            {[
              { type: 'SAFE', color: 'emerald', label: 'Safe Zone', count: zones.filter(z => z.type === 'SAFE').length },
              { type: 'ALERT', color: 'amber', label: 'Alert Zone', count: zones.filter(z => z.type === 'ALERT').length },
              { type: 'RESTRICTED', color: 'red', label: 'Restricted', count: zones.filter(z => z.type === 'RESTRICTED').length }
            ].map(({ type, color, label, count }) => (
              <div key={type} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 bg-${color}-500 rounded-md shadow-sm`}></div>
                  <span className="font-medium text-gray-700">{label}</span>
                </div>
                <span className={`font-bold text-${color}-600`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add CSS animations and map fixes */}
      <style jsx>{`
        @keyframes pulse-enhanced {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        .user-marker-enhanced {
          transition: all 0.3s ease;
        }

        .user-marker-enhanced:hover {
          transform: scale(1.2);
        }

        /* Ensure map displays properly */
        .maplibregl-map {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 400px !important;
        }

        .maplibregl-canvas {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }

        .maplibregl-control-container {
          position: absolute !important;
        }
      `}</style>
    </div>
  );
}
