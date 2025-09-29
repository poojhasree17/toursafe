'use client';

import { useState, useEffect, useCallback } from 'react';
import { TourSafeMap } from '../../../components/map';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, AlertTriangle, Settings, Home, Wifi, WifiOff, MapPin, Bell, BellOff } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStoredVC } from '../../../lib/utils';
import { requestNotificationPermission, onMessageListener } from '../../../lib/firebase';
import { supabase } from '../../../lib/supabase';

interface Zone {
  id: string;
  name: string;
  type: 'SAFE' | 'RESTRICTED' | 'ALERT';
  polygon_geojson: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
}

export default function TouristMapPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [touristId, setTouristId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize FCM and load data on mount
  useEffect(() => {
    loadZones();
    extractTouristId();
    initializeNotifications();
  }, []);

  // Set up FCM message listener
  useEffect(() => {
    const unsubscribe = onMessageListener((payload) => {
      console.log('FCM message received:', payload);

      const { title, body } = payload.notification || {};

      toast(body || title || 'Notification', {
        duration: 5000,
      });
    });

    return unsubscribe;
  }, []);

  const initializeNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setNotificationsEnabled(true);

        // Register the token with our backend
        await fetch('/api/v1/notify/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            platform: 'web',
            touristId, // Will be set later in extractTouristId
          }),
        });
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const extractTouristId = async () => {
    const vcJwt = getStoredVC();
    if (!vcJwt) {
      toast.error('No credential found. Please import your VC first.');
      return;
    }

    try {
      // Verify VC and get tourist ID
      const response = await fetch('/api/v1/vc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vcJwt })
      });

      if (response.ok) {
        const result = await response.json();
        // For demo, we'll use one of the seeded tourist IDs
        setTouristId('33333333-3333-3333-3333-333333333333');
        setIsTracking(true);

        // Update notification registration with tourist ID
        if (notificationsEnabled) {
          const token = await requestNotificationPermission();
          if (token) {
            await fetch('/api/v1/notify/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token,
                platform: 'web',
                touristId: '33333333-3333-3333-3333-333333333333',
              }),
            });
          }
        }
      } else {
        throw new Error('Failed to verify VC');
      }
    } catch (error) {
      console.error('Tourist ID extraction failed:', error);
      toast.error('Failed to verify credential');
    }
  };

  const loadZones = async () => {
    try {
      const response = await fetch('/api/v1/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
      } else {
        throw new Error('Failed to load zones');
      }
    } catch (error) {
      console.error('Failed to load zones:', error);
      toast.error('Failed to load safety zones');
    }
  };

  const handleLocationUpdate = useCallback(async (lat: number, lng: number) => {
    setUserLocation([lng, lat]);

    if (!isTracking || !touristId) return;

    try {
      const response = await fetch('/api/v1/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourist_id: touristId,
          lat,
          lng,
          speed: null, // Will be calculated from GPS if available
          bearing: null
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Handle zone warnings
        if (result.zonesHit && result.zonesHit.length > 0) {
          result.zonesHit.forEach((zone: any) => {
            if (zone.type === 'RESTRICTED') {
              toast.error(`⚠️ Warning: Entering ${zone.name}`, {
                duration: 5000,
                className: 'toast-danger'
              });
            } else if (zone.type === 'ALERT') {
              toast('⚡ Caution: You are in an alert zone', {
                duration: 3000,
                className: 'toast-warning'
              });
            }
          });
        }

        // Handle incident creation
        if (result.incidentCreated) {
          toast.error(`🚨 Incident Created: ${result.incidentCreated.type}`, {
            duration: 10000
          });
        }
      } else {
        console.error('Failed to send ping:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to send location ping:', error);
      // Store offline for later sync (simplified version)
      if (!isOnline) {
        toast('📴 Location saved offline', { duration: 2000 });
      }
    }
  }, [isTracking, touristId, isOnline]);

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
      setIsTracking(false);
      toast.success('Location tracking stopped');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationUpdate(latitude, longitude);
      },
      (error) => {
        console.error('Location tracking error:', error);
        toast.error('Location tracking failed');
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // 30 seconds
      }
    );

    setLocationWatchId(watchId);
    setIsTracking(true);
    toast.success('Location tracking started');
  };

  const handleSOS = async () => {
    if (!userLocation || !touristId) {
      toast.error('Location not available for SOS');
      return;
    }

    if (showSOSConfirm) {
      // Actually send SOS
      try {
        const response = await fetch('/api/v1/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourist_id: touristId,
            type: 'SOS',
            lat: userLocation[1], // latitude
            lng: userLocation[0], // longitude
            severity: 'HIGH'
          })
        });

        if (response.ok) {
          const result = await response.json();
          setShowSOSConfirm(false);
          toast.success('🆘 SOS Alert Sent!', {
            duration: 5000,
            icon: '🚨'
          });
        } else {
          throw new Error('Failed to send SOS');
        }
      } catch (error) {
        console.error('SOS failed:', error);
        toast.error('Failed to send SOS alert');
        setShowSOSConfirm(false);
      }
    } else {
      // Show confirmation dialog
      setShowSOSConfirm(true);
    }
  };

  const cancelSOS = () => {
    setShowSOSConfirm(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">TourSafe</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Notifications Status */}
            <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
              notificationsEnabled ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {notificationsEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
              <span>{notificationsEnabled ? 'Alerts On' : 'Alerts Off'}</span>
            </div>

            {/* Tracking Status */}
            <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
              isTracking ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}>
              <div className={`h-2 w-2 rounded-full ${isTracking ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span>{isTracking ? 'Tracking' : 'Stopped'}</span>
            </div>

            {/* Navigation */}
            <Link href="/tourist">
              <Button variant="ghost" size="icon">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/tourist/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <TourSafeMap
          center={[72.8350, 18.9220]} // Mumbai center
          zoom={15}
          zones={zones}
          userLocation={userLocation || undefined}
          onLocationUpdate={handleLocationUpdate}
          showSOS={true}
          onSOSClick={handleSOS}
          isTracking={isTracking}
          onTrackingToggle={startLocationTracking}
        />
      </div>

      {/* SOS Confirmation Dialog */}
      {showSOSConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold">Emergency SOS</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will send an immediate emergency alert to authorities with your current location.
              Are you sure you want to proceed?
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={cancelSOS}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSOS}
                className="flex-1"
              >
                Send SOS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Info Panel */}
      <div className="bg-white border-t p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {zones.filter(z => z.type === 'SAFE').length}
            </div>
            <div className="text-xs text-green-600">Safe Zones</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {zones.filter(z => z.type === 'ALERT').length}
            </div>
            <div className="text-xs text-yellow-600">Alert Zones</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {zones.filter(z => z.type === 'RESTRICTED').length}
            </div>
            <div className="text-xs text-red-600">Restricted</div>
          </div>
        </div>

        {userLocation && (
          <div className="mt-3 pt-3 border-t text-center">
            <div className="text-xs text-gray-500">
              Current Location: {userLocation[1].toFixed(6)}, {userLocation[0].toFixed(6)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
