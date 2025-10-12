'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@toursafe/ui';
import { MapPin, AlertTriangle, Users, Layers } from 'lucide-react';

// Dynamically import Leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });

import 'leaflet/dist/leaflet.css';

interface HeatMapPoint {
  lat: number;
  lng: number;
  intensity: number;
  type: string;
  timestamp?: string;
}

interface ClusterData {
  lat: number;
  lng: number;
  count: number;
  totalIntensity: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  types?: { [key: string]: number };
}

interface HeatMapVisualizerProps {
  center?: [number, number];
  zoom?: number;
  points?: HeatMapPoint[];
  clusters?: ClusterData[];
  onClusterClick?: (cluster: ClusterData) => void;
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'CRITICAL':
      return '#7f1d1d'; // Dark red
    case 'HIGH':
      return '#dc2626'; // Red
    case 'MEDIUM':
      return '#f59e0b'; // Orange
    case 'LOW':
      return '#10b981'; // Green
    default:
      return '#6b7280'; // Gray
  }
};

const getIntensityColor = (intensity: number) => {
  if (intensity >= 10) return '#dc2626'; // Red
  if (intensity >= 5) return '#f59e0b'; // Orange
  if (intensity >= 2) return '#fbbf24'; // Yellow
  return '#10b981'; // Green
};

export function HeatMapVisualizer({
  center = [18.9220, 72.8347],
  zoom = 12,
  points = [],
  clusters = [],
  onClusterClick
}: HeatMapVisualizerProps) {
  const mapRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [showPoints, setShowPoints] = useState(true);
  const [showClusters, setShowClusters] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading heat map...</p>
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
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Render cluster circles */}
        {showClusters && clusters.map((cluster, idx) => (
          <Circle
            key={`cluster-${idx}`}
            center={[cluster.lat, cluster.lng]}
            radius={Math.min(cluster.count * 100, 1000)} // Max 1km radius
            pathOptions={{
              color: getRiskColor(cluster.riskLevel),
              fillColor: getRiskColor(cluster.riskLevel),
              fillOpacity: 0.3,
              weight: 2
            }}
            eventHandlers={{
              click: () => onClusterClick?.(cluster)
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center space-x-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getRiskColor(cluster.riskLevel) }}
                  ></div>
                  <span className="font-semibold text-sm">{cluster.riskLevel} Risk Zone</span>
                </div>
                <p className="text-xs text-gray-600">Incidents: {cluster.count}</p>
                <p className="text-xs text-gray-600">Total Intensity: {cluster.totalIntensity}</p>
                {cluster.types && (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">Incident Types:</p>
                    {Object.entries(cluster.types).map(([type, count]) => (
                      <p key={type} className="text-gray-600">
                        {type}: {count}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Render individual points */}
        {showPoints && points.map((point, idx) => (
          <CircleMarker
            key={`point-${idx}`}
            center={[point.lat, point.lng]}
            radius={Math.min(point.intensity * 2, 15)}
            pathOptions={{
              color: getIntensityColor(point.intensity),
              fillColor: getIntensityColor(point.intensity),
              fillOpacity: 0.7,
              weight: 1
            }}
          >
            <Popup>
              <div className="p-2">
                <p className="font-semibold text-sm">{point.type}</p>
                <p className="text-xs text-gray-600">Intensity: {point.intensity}</p>
                <p className="text-xs text-gray-600">
                  Location: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </p>
                {point.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(point.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Layer Controls */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-3 z-[1000]">
        <h4 className="text-sm font-semibold mb-2 flex items-center">
          <Layers className="h-4 w-4 mr-2" />
          Heat Map Layers
        </h4>
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
              className="rounded"
            />
            <span>Risk Clusters</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
              className="rounded"
            />
            <span>Individual Points</span>
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-3 z-[1000]">
        <h4 className="text-sm font-semibold mb-2">Risk Levels</h4>
        <div className="space-y-1">
          {[
            { level: 'CRITICAL', color: '#7f1d1d', label: 'Critical' },
            { level: 'HIGH', color: '#dc2626', label: 'High' },
            { level: 'MEDIUM', color: '#f59e0b', label: 'Medium' },
            { level: 'LOW', color: '#10b981', label: 'Low' }
          ].map(({ level, color, label }) => (
            <div key={level} className="flex items-center space-x-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              ></div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Badge */}
      {(points.length > 0 || clusters.length > 0) && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-3 z-[1000]">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">{points.length}</span>
              <span className="text-gray-600">points</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-semibold">{clusters.length}</span>
              <span className="text-gray-600">clusters</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

