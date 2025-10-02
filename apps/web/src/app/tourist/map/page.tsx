'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TourSafeMap } from '../../../components/toursafe-map-leaflet';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@toursafe/ui';
import {
  Shield, AlertTriangle, Settings, Home, Wifi, WifiOff, MapPin, Bell, BellOff,
  Activity, Target, Clock, TrendingUp, Users, Phone, MessageCircle,
  Navigation, Zap, Eye, EyeOff, Maximize, Minimize, Layers, Info,
  CheckCircle, XCircle, AlertCircle, Star, Award, Timer, Route,
  Satellite, Map as MapIcon, Crosshair, Radio, Battery
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStoredVC, calculateTouristSafetyScore } from '../../../lib/utils';
import { requestNotificationPermission, onMessageListener } from '../../../lib/firebase';
import { supabase } from '../../../lib/supabase';
import { SafetyScoreDisplay } from '../../../components/safety-score';

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

interface LocationHistory {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed?: number;
}

interface TripStats {
  distance: number;
  duration: number;
  safeZonesVisited: number;
  alertsReceived: number;
  safetyScore: number;
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

  // Enhanced state management
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showZoneDetails, setShowZoneDetails] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const [tripStats, setTripStats] = useState<TripStats>({
    distance: 0,
    duration: 0,
    safeZonesVisited: 0,
    alertsReceived: 0,
    safetyScore: 100
  });
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: '1', name: 'Local Police', number: '100', type: 'police' },
    { id: '2', name: 'Medical Emergency', number: '108', type: 'medical' },
    { id: '3', name: 'Fire Department', number: '101', type: 'fire' }
  ]);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [safetyScore, setSafetyScore] = useState<any>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Map style change handler
  const handleMapStyleChange = (newStyle: 'streets' | 'satellite' | 'terrain') => {
    setMapStyle(newStyle);
  };

  // Utility functions
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const getBatteryLevel = async (): Promise<number> => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return Math.round(battery.level * 100);
      } catch (error) {
        console.error('Battery API error:', error);
      }
    }
    return 100; // Default if API not available
  };

  const updateTripStats = useCallback(() => {
    if (locationHistory.length >= 2) {
      const latest = locationHistory[locationHistory.length - 1];
      const previous = locationHistory[locationHistory.length - 2];

      const distance = calculateDistance(
        previous.lat, previous.lng,
        latest.lat, latest.lng
      );

      setTripStats(prev => ({
        ...prev,
        distance: prev.distance + distance,
        duration: prev.duration + ((latest.timestamp - previous.timestamp) / 1000),
        safetyScore: Math.max(0, prev.safetyScore - (prev.alertsReceived * 5))
      }));
    }
  }, [locationHistory]);

  // Check online status and battery
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    // Initialize battery monitoring
    getBatteryLevel().then(setBatteryLevel);

    const batteryInterval = setInterval(() => {
      getBatteryLevel().then(setBatteryLevel);
    }, 30000); // Update every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(batteryInterval);
    };
  }, []);

  // Update trip stats periodically
  useEffect(() => {
    if (isTracking && locationHistory.length > 0) {
      statsIntervalRef.current = setInterval(updateTripStats, 5000);
      return () => {
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
        }
      };
    }
  }, [isTracking, locationHistory, updateTripStats]);

  // Initialize FCM and load data on mount
  useEffect(() => {
    // Initialize tourist ID first for immediate availability
    const initTouristId = async () => {
      await extractTouristId();
    };

    initTouristId();
    loadZones();
    initializeNotifications();
  }, []);

  // Auto-start location tracking when tourist ID becomes available
  useEffect(() => {
    if (touristId && !isTracking && !locationWatchId) {
      console.log('🚀 Auto-starting location tracking...');
      startLocationTracking();
    }
  }, [touristId, isTracking, locationWatchId]);

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
    try {
      const vcJwt = getStoredVC();
      if (!vcJwt) {
        // No VC found - use demo mode immediately
        console.log('📱 No VC found in localStorage, using demo mode');
        setTouristId('33333333-3333-3333-3333-333333333333');
        setIsTracking(true);
        toast('🎭 Demo Mode: Using Alice Tourist profile', {
          duration: 4000,
          icon: '👤'
        });
        return;
      }

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

        toast.success('✅ Credential verified - Tracking started', {
          duration: 3000
        });

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
      console.warn('ℹ️ VC verification failed, falling back to demo mode:', error);
      // Fallback to demo mode
      setTouristId('33333333-3333-3333-3333-333333333333');
      setIsTracking(true);
      toast('🎭 Demo Mode: Using Alice Tourist profile', {
        duration: 4000,
        icon: '👤'
      });
    }
  };

  const loadZones = async () => {
    try {
      const response = await fetch('/api/v1/zones');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded zones:', data.zones?.length || 0, data.zones);
        setZones(data.zones || []);
      } else {
        throw new Error('Failed to load zones');
      }
    } catch (error) {
      console.error('Failed to load zones:', error);
      toast.error('Failed to load safety zones');
    }
  };

  // Calculate initial safety score when zones and location are available
  useEffect(() => {
    if (zones.length > 0 && userLocation && !safetyScore) {
      const recentPings: any[] = [];
      const score = calculateTouristSafetyScore(
        { lat: userLocation[1], lng: userLocation[0] },
        zones,
        recentPings,
        new Date()
      );
      setSafetyScore(score);
      setTripStats(prev => ({
        ...prev,
        safetyScore: score.score
      }));
    }
  }, [zones, userLocation, safetyScore]);

  const handleLocationUpdate = useCallback(async (lat: number, lng: number, accuracy?: number, speed?: number) => {
    const locationData: LocationHistory = {
      lat,
      lng,
      timestamp: Date.now(),
      accuracy: accuracy || 0,
      speed: speed || 0
    };

    setUserLocation([lng, lat]);
    setLocationHistory(prev => [...prev.slice(-49), locationData]); // Keep last 50 locations
    setLocationAccuracy(accuracy || 0);
    setCurrentSpeed(speed || 0);

    // Calculate safety score
    if (zones.length > 0) {
      const recentPings = locationHistory.slice(-10).map(loc => ({
        lat: loc.lat,
        lng: loc.lng,
        ts: new Date(loc.timestamp).toISOString(),
        speed: loc.speed
      }));

      const score = calculateTouristSafetyScore(
        { lat, lng },
        zones,
        recentPings,
        new Date()
      );

      setSafetyScore(score);

      // Update trip stats with safety score
      setTripStats(prev => ({
        ...prev,
        safetyScore: score.score
      }));
    }

    if (!isTracking || !touristId) return;

    try {
      const response = await fetch('/api/v1/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourist_id: touristId,
          lat,
          lng,
          speed: speed || null,
          bearing: null,
          accuracy: accuracy || null
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Update trip stats for safe zones visited
        if (result.zonesHit && result.zonesHit.length > 0) {
          result.zonesHit.forEach((zone: any) => {
            if (zone.type === 'SAFE') {
              setTripStats(prev => ({
                ...prev,
                safeZonesVisited: prev.safeZonesVisited + 1
              }));
            }
          });
        }

        // Handle zone warnings with enhanced notifications
        if (result.zonesHit && result.zonesHit.length > 0) {
          result.zonesHit.forEach((zone: any) => {
            if (zone.type === 'RESTRICTED') {
              toast.error(`⚠️ Restricted Area: ${zone.name}`, {
                duration: 5000,
                className: 'toast-danger',
                icon: '🚫'
              });
              setTripStats(prev => ({
                ...prev,
                alertsReceived: prev.alertsReceived + 1,
                safetyScore: Math.max(0, prev.safetyScore - 10)
              }));
            } else if (zone.type === 'ALERT') {
              toast('⚡ Caution: Alert Zone Detected', {
                duration: 4000,
                className: 'toast-warning',
                icon: '⚠️'
              });
              setTripStats(prev => ({
                ...prev,
                alertsReceived: prev.alertsReceived + 1,
                safetyScore: Math.max(0, prev.safetyScore - 5)
              }));
            }
          });
        }

        // Handle incident creation with enhanced feedback
        if (result.incidentCreated) {
          toast.error(`🚨 Emergency Incident: ${result.incidentCreated.type}`, {
            duration: 10000,
            icon: '🚨'
          });
          setTripStats(prev => ({
            ...prev,
            safetyScore: Math.max(0, prev.safetyScore - 20)
          }));
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
        const { latitude, longitude, accuracy, speed } = position.coords;
        handleLocationUpdate(latitude, longitude, accuracy, speed || undefined);
      },
      (error) => {
        console.error('Location tracking error:', error);
        toast.error(`Location tracking failed: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000 // 10 seconds for more frequent updates
      }
    );

    setLocationWatchId(watchId);
    setIsTracking(true);
    toast.success('Location tracking started');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && mapRef.current) {
      mapRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEmergencyCall = (contact: { number: string; name: string }) => {
    if (confirm(`Call ${contact.name} at ${contact.number}?`)) {
      window.open(`tel:${contact.number}`);
    }
  };

  const selectZone = (zone: Zone) => {
    setSelectedZone(zone);
    setShowZoneDetails(true);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getSafetyScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSafetyScoreIcon = (score: number) => {
    if (score >= 80) return <Award className="h-4 w-4" />;
    if (score >= 60) return <Star className="h-4 w-4" />;
    if (score >= 40) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const handleSOS = async () => {
    console.log('🚨 handleSOS called!', { userLocation, touristId, showSOSConfirm });

    // Ensure tourist ID is available
    if (!touristId) {
      console.warn('❌ SOS failed: Tourist ID not initialized');
      toast.error('Please wait for initialization or refresh the page');
      return;
    }

    // Get location if not available
    if (!userLocation) {
      console.log('📍 Getting current location for SOS...');
      toast('Getting your location for emergency services...', { duration: 2000 });

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // Accept location up to 1 minute old
          });
        });

        const { latitude, longitude } = position.coords;
        // Update user location for future use
        setUserLocation([longitude, latitude]);
        console.log('✅ Got location for SOS:', { latitude, longitude });

        // Send SOS with obtained location
        await sendSOSAlert(touristId, latitude, longitude);
      } catch (error) {
        console.error('❌ Failed to get location for SOS:', error);

        let errorMessage = 'Unable to get your location. ';

        if (error instanceof GeolocationPositionError) {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied. Please enable location permissions in your browser settings and refresh the page.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable. Please check your device settings.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage += 'Please check your location settings and try again.';
          }
        } else {
          errorMessage += 'Please ensure location services are enabled and try again.';
        }

        toast.error(errorMessage, { duration: 6000 });
        return;
      }
    } else {
      // Location already available, send SOS
      await sendSOSAlert(touristId, userLocation[1], userLocation[0]);
    }
  };

  // Helper function to send SOS alert
  const sendSOSAlert = async (touristId: string, latitude: number, longitude: number) => {
    if (showSOSConfirm) {
      // Actually send SOS
      try {
        const response = await fetch('/api/v1/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourist_id: touristId,
            type: 'SOS',
            lat: latitude,
            lng: longitude,
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
          throw new Error(`Failed to send SOS: ${response.statusText}`);
        }
      } catch (error) {
        console.error('SOS failed:', error);

        let errorMessage = 'Failed to send SOS alert. ';

        if (error instanceof Error) {
          if (error.message.includes('Failed to send SOS')) {
            errorMessage += 'Emergency services may be unavailable. Please contact emergency services directly.';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Network error. Please check your connection and try again.';
          } else {
            errorMessage += 'Please try again or contact emergency services directly.';
          }
        } else {
          errorMessage += 'Please try again or contact emergency services directly.';
        }

        toast.error(errorMessage, { duration: 6000 });
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50" ref={mapRef}>
      {/* Enhanced Header */}
      <div className="bg-white/90 backdrop-blur-md shadow-lg border-b border-white/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TourSafe</h1>
              <p className="text-xs text-gray-600">Real-time Safety Monitoring</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* System Status Indicators */}
            <div className="flex items-center space-x-1">
              {/* Connection Status */}
              <div className={`flex items-center space-x-1 text-xs px-2 py-1.5 rounded-full transition-all duration-200 ${
                isOnline ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-red-100 text-red-700 shadow-sm'
              }`}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Battery Level */}
              <div className={`flex items-center space-x-1 text-xs px-2 py-1.5 rounded-full transition-all duration-200 ${
                batteryLevel > 20 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <Battery className="h-3 w-3" />
                <span className="font-medium">{batteryLevel}%</span>
              </div>

              {/* Notifications Status */}
              <div className={`flex items-center space-x-1 text-xs px-2 py-1.5 rounded-full transition-all duration-200 ${
                notificationsEnabled ? 'bg-purple-100 text-purple-700 shadow-sm' : 'bg-gray-100 text-gray-700'
              }`}>
                {notificationsEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                <span className="font-medium">{notificationsEnabled ? 'Alerts' : 'Silent'}</span>
              </div>

              {/* Tracking Status */}
              <div className={`flex items-center space-x-1 text-xs px-2 py-1.5 rounded-full transition-all duration-200 ${
                isTracking ? 'bg-blue-100 text-blue-700 shadow-sm animate-pulse' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className={`h-2 w-2 rounded-full ${isTracking ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                <span className="font-medium">{isTracking ? 'Live' : 'Paused'}</span>
                {!isTracking && (
                  <span className="text-xs text-gray-500 ml-1" title="Location tracking is recommended for SOS alerts">
                    (SOS needs location)
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="hover:bg-gray-100"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              <Link href="/tourist">
                <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/tourist/settings">
                <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container with Enhanced Controls */}
      <div className="flex-1 relative">
        <TourSafeMap
          center={[18.9220, 72.8350]} // Mumbai center [lat, lng]
          zoom={15}
          zones={zones}
          userLocation={userLocation || undefined}
          onLocationUpdate={handleLocationUpdate}
          showSOS={true}
          onSOSClick={handleSOS}
          isTracking={isTracking}
          onTrackingToggle={startLocationTracking}
          onZoneSelect={selectZone}
          mapStyle={mapStyle}
          onMapStyleChange={handleMapStyleChange}
        />

        {/* Debug info - remove in production */}
        <div className="absolute top-20 right-4 bg-white/90 p-2 rounded text-xs z-40">
          <div>Zones: {zones.length}</div>
          <div>Location: {userLocation ? `${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}` : 'None'}</div>
          <div>Tracking: {isTracking ? 'ON' : 'OFF'}</div>
          <div>TouristId: {touristId || 'None'}</div>
          <div>SOS Confirm: {showSOSConfirm ? 'ON' : 'OFF'}</div>
        </div>


        {/* Location Accuracy Indicator */}
        {locationAccuracy > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white/90 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-white/20">
              <div className="flex items-center space-x-2 text-sm">
                <Crosshair className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">±{Math.round(locationAccuracy)}m</div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced SOS Confirmation Dialog */}
      {showSOSConfirm && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-white/95 backdrop-blur-md shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-900">Emergency SOS Alert</CardTitle>
              <CardDescription className="text-gray-600">
                This will immediately notify emergency services and your registered contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Emergency Contacts */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Emergency Contacts</h4>
                <div className="grid grid-cols-1 gap-2">
                  {emergencyContacts.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="outline"
                      className="justify-start h-auto p-3"
                      onClick={() => handleEmergencyCall(contact)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          contact.type === 'police' ? 'bg-blue-100 text-blue-600' :
                          contact.type === 'medical' ? 'bg-green-100 text-green-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-gray-600">{contact.number}</div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
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
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Send SOS Alert
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Bottom Panel */}
      <div className="bg-white/95 backdrop-blur-md border-t border-white/20 p-4">
        {/* Zone Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Safe Zones', count: zones.filter(z => z.type === 'SAFE').length, color: 'green', icon: CheckCircle },
            { label: 'Alert Zones', count: zones.filter(z => z.type === 'ALERT').length, color: 'yellow', icon: AlertCircle },
            { label: 'Restricted', count: zones.filter(z => z.type === 'RESTRICTED').length, color: 'red', icon: XCircle },
            { label: 'Total Zones', count: zones.length, color: 'blue', icon: Layers }
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className={`text-2xl font-bold text-${color}-600 mb-1`}>
                {count}
              </div>
              <div className={`text-xs text-${color}-600 font-medium flex items-center justify-center`}>
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Trip Statistics Toggle */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Trip Statistics</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStatsPanel(!showStatsPanel)}
            className="text-gray-600 hover:text-gray-900"
          >
            {showStatsPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        {showStatsPanel && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Route className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">Distance</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {formatDistance(tripStats.distance)}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Timer className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-900">Duration</span>
              </div>
              <div className="text-lg font-bold text-green-900">
                {formatDuration(tripStats.duration)}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-900">Safe Visits</span>
              </div>
              <div className="text-lg font-bold text-purple-900">
                {tripStats.safeZonesVisited}
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                {getSafetyScoreIcon(tripStats.safetyScore)}
                <span className={`text-xs font-medium ${getSafetyScoreColor(tripStats.safetyScore)}`}>
                  Safety Score
                </span>
              </div>
              <div className={`text-lg font-bold ${getSafetyScoreColor(tripStats.safetyScore)}`}>
                {Math.round(tripStats.safetyScore)}%
              </div>
            </div>
          </div>
        )}

        {/* Safety Score Display */}
        {safetyScore && (
          <SafetyScoreDisplay safetyScore={safetyScore} className="mb-4" />
        )}

        {/* Current Location & Speed */}
        {userLocation && (
          <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700">
                {userLocation[1].toFixed(6)}, {userLocation[0].toFixed(6)}
              </span>
            </div>
            {currentSpeed > 0 && (
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 font-medium">
                  {Math.round(currentSpeed * 3.6)} km/h
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone Details Modal */}
      {showZoneDetails && selectedZone && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full bg-white/95 backdrop-blur-md shadow-2xl border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <div className={`p-2 rounded-full ${
                    selectedZone.type === 'SAFE' ? 'bg-green-100 text-green-600' :
                    selectedZone.type === 'ALERT' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {selectedZone.type === 'SAFE' ? <CheckCircle className="h-5 w-5" /> :
                     selectedZone.type === 'ALERT' ? <AlertCircle className="h-5 w-5" /> :
                     <XCircle className="h-5 w-5" />}
                  </div>
                  <span>{selectedZone.name}</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowZoneDetails(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Type</div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedZone.type === 'SAFE' ? 'bg-green-100 text-green-800' :
                    selectedZone.type === 'ALERT' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedZone.type}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Risk Level</div>
                  <div className={`font-medium ${
                    selectedZone.riskLevel === 'LOW' ? 'text-green-600' :
                    selectedZone.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                    selectedZone.riskLevel === 'HIGH' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {selectedZone.riskLevel || 'UNKNOWN'}
                  </div>
                </div>
              </div>

              {selectedZone.description && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">Description</div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {selectedZone.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Last Updated</div>
                  <div className="text-sm text-gray-900">
                    {selectedZone.lastUpdated ? new Date(selectedZone.lastUpdated).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Incidents</div>
                  <div className="text-sm text-gray-900">
                    {selectedZone.incidentCount || 0} reported
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
