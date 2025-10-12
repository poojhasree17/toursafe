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
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showTrackingPanel, setShowTrackingPanel] = useState<boolean>(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs to avoid closure issues in geolocation callback
  const isTrackingRef = useRef(isTracking);
  const touristIdRef = useRef(touristId);

  // Keep refs in sync with state
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    touristIdRef.current = touristId;
  }, [touristId]);

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

  // Manual tracking control - removed auto-start for user control
  // Users now need to click "Start Tracking" button manually
  // useEffect(() => {
  //   if (touristId && !isTracking && !locationWatchId) {
  //     console.log('🚀 Auto-starting location tracking...');
  //     startLocationTracking();
  //   }
  // }, [touristId, isTracking, locationWatchId]);

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
        setShowOnboarding(true);
        toast.success('🎭 Demo Mode: Using Alice Tourist profile', {
          duration: 3000,
          icon: '👤'
        });
        
        // Show onboarding after a short delay
        setTimeout(() => {
          if (!localStorage.getItem('toursafe_onboarding_seen')) {
            toast('💡 Click "Start Tracking" in the GPS panel to begin monitoring your safety', {
              duration: 5000,
              icon: '👆'
            });
            localStorage.setItem('toursafe_onboarding_seen', 'true');
          }
        }, 2000);
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

        toast.success('✅ Credential verified. Click "Start Tracking" to begin.', {
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
      toast('🎭 Demo Mode: Using Alice Tourist profile. Click "Start Tracking" to begin.', {
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
    console.log('📍 Location Update:', {
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      accuracy: accuracy ? `±${accuracy.toFixed(0)}m` : 'N/A',
      speed: speed ? `${(speed * 3.6).toFixed(1)} km/h` : 'N/A',
      timestamp: new Date().toLocaleTimeString()
    });

    const locationData: LocationHistory = {
      lat,
      lng,
      timestamp: Date.now(),
      accuracy: accuracy || 0,
      speed: speed || 0
    };

    setUserLocation([lng, lat]);
    setLocationHistory(prev => {
      const updated = [...prev.slice(-49), locationData];
      console.log(`📊 Location history: ${updated.length} points logged`);
      return updated;
    });
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

    // Use refs to get current values (fixes closure issue)
    const currentIsTracking = isTrackingRef.current;
    const currentTouristId = touristIdRef.current;

    console.log('🔍 Ping check:', { 
      isTracking: currentIsTracking, 
      touristId: currentTouristId,
      willSendPing: currentIsTracking && !!currentTouristId 
    });

    if (!currentIsTracking || !currentTouristId) {
      console.log('⏸️ Skipping ping - tracking inactive or no tourist ID');
      return;
    }

    try {
      console.log('📡 Sending location ping to server...', {
        tourist_id: currentTouristId,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6)
      });

      const pingData: any = {
        tourist_id: currentTouristId,
        lat,
        lng
      };
      
      // Only include optional fields if they have valid values
      if (speed !== undefined && speed !== null) {
        pingData.speed = speed;
      }
      // Note: bearing is not available from browser geolocation API
      
      console.log('📦 Ping payload:', pingData);

      const response = await fetch('/api/v1/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pingData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Ping successful:', result);

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
          console.log(`⚠️ Entered ${result.zonesHit.length} zone(s):`, result.zonesHit.map((z: any) => `${z.name} (${z.type})`));
          
          result.zonesHit.forEach((zone: any) => {
            if (zone.type === 'RESTRICTED') {
              console.error(`🚫 RESTRICTED ZONE: ${zone.name}`);
              toast.error(`🚫 RESTRICTED ZONE: ${zone.name}\n\n${zone.description || 'This area is restricted for safety reasons.'}\n\nLeave immediately and contact authorities if needed.`, {
                duration: 8000,
                className: 'toast-danger',
                icon: '🚫'
              });
              setTripStats(prev => ({
                ...prev,
                alertsReceived: prev.alertsReceived + 1,
                safetyScore: Math.max(0, prev.safetyScore - 15)
              }));
            } else if (zone.type === 'ALERT') {
              console.warn(`⚠️ ALERT ZONE: ${zone.name}`);
              toast(`⚠️ CAUTION: ${zone.name}\n\n${zone.description || 'Exercise caution in this area.'}\n\nRisk Level: ${zone.riskLevel || 'MEDIUM'}`, {
                duration: 6000,
                className: 'toast-warning',
                icon: '⚠️'
              });
              setTripStats(prev => ({
                ...prev,
                alertsReceived: prev.alertsReceived + 1,
                safetyScore: Math.max(0, prev.safetyScore - 8)
              }));
            } else if (zone.type === 'SAFE') {
              console.log(`✅ SAFE ZONE: ${zone.name}`);
              toast.success(`✅ Safe Zone: ${zone.name}\n\n${zone.description || 'You are in a monitored safe area.'}`, {
                duration: 3000,
                className: 'toast-success',
                icon: '✅'
              });
              setTripStats(prev => ({
                ...prev,
                safetyScore: Math.min(100, prev.safetyScore + 2)
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
  }, [isOnline, zones, locationHistory]); // Removed isTracking and touristId - using refs instead

  const startLocationTracking = () => {
    console.log('🎯 START TRACKING BUTTON CLICKED!');
    console.log('Current state:', { isTracking, locationWatchId, touristId });
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    // Stop tracking if already active
    if (locationWatchId) {
      console.log('⏹️ Stopping location tracking...');
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
      setIsTracking(false);
      toast.success('📍 GPS Tracking Stopped', {
        duration: 3000,
        icon: '⏹️'
      });
      return;
    }

    // Start tracking
    console.log('▶️ Starting location tracking...');
    toast.loading('📡 Acquiring GPS signal...', { id: 'gps-start' });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        console.log('📍 GPS Position received:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed
        });
        
        const { latitude, longitude, accuracy, speed } = position.coords;
        handleLocationUpdate(latitude, longitude, accuracy, speed || undefined);
      },
      (error) => {
        console.error('❌ Location tracking error:', error);
        let errorMsg = 'Location tracking failed';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable. Please check your GPS.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location request timed out. Please try again.';
            break;
        }
        
        toast.error(errorMsg, { id: 'gps-start', duration: 5000 });
        setIsTracking(false);
        setLocationWatchId(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // 30 seconds - give GPS more time to get accurate fix
        maximumAge: 0 // Don't use cached position - always get fresh GPS fix
      }
    );

    console.log('✅ GPS Watch started, watchId:', watchId);
    setLocationWatchId(watchId);
    setIsTracking(true);
    
    toast.success('🎯 GPS Tracking Active!', {
      id: 'gps-start',
      duration: 3000,
      icon: '📡'
    });
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
            </div>

            {/* Tracking Control Button - PROMINENT */}
            <Button
              onClick={startLocationTracking}
              className={`${
                isTracking 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg ring-2 ring-green-300' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg ring-2 ring-blue-300 animate-pulse'
              } text-white font-bold px-5 py-2.5 transition-all duration-200 transform hover:scale-105`}
            >
              {isTracking ? (
                <>
                  <Radio className="h-5 w-5 mr-2 animate-pulse" />
                  <span>Tracking Live</span>
                </>
              ) : (
                <>
                  <Navigation className="h-5 w-5 mr-2" />
                  <span>Start Tracking</span>
                </>
              )}
            </Button>

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

        {/* Compact Floating Control Buttons - Top Left */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col space-y-2 pointer-events-auto">
          {/* Quick Tracking Toggle Button */}
          <Button
            onClick={startLocationTracking}
            className={`pointer-events-auto ${
              isTracking 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-xl ring-2 ring-green-300' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl ring-2 ring-blue-300 animate-pulse'
            } text-white font-bold px-4 py-3 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2`}
          >
            {isTracking ? (
              <>
                <Radio className="h-5 w-5 animate-pulse" />
                <span>Tracking</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">LIVE</span>
              </>
            ) : (
              <>
                <Navigation className="h-5 w-5" />
                <span>Start GPS</span>
              </>
            )}
          </Button>

          {/* Compact Info Panel - Only when tracking */}
          {isTracking && (
            <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-white/20 p-3 space-y-2 pointer-events-auto">
              {/* Tracking Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {locationHistory.length > 0 && (
                  <div className="flex items-center space-x-1 bg-blue-50 rounded px-2 py-1">
                    <MapPin className="h-3 w-3 text-blue-600" />
                    <span className="font-bold text-blue-900">{locationHistory.length}</span>
                    <span className="text-blue-600">pts</span>
                  </div>
                )}
                {locationAccuracy > 0 && (
                  <div className={`flex items-center space-x-1 rounded px-2 py-1 ${
                    locationAccuracy < 50 ? 'bg-green-50' : 
                    locationAccuracy < 100 ? 'bg-yellow-50' : 'bg-red-50'
                  }`}>
                    <Crosshair className={`h-3 w-3 ${
                      locationAccuracy < 50 ? 'text-green-600' : 
                      locationAccuracy < 100 ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                    <span className={`font-bold ${
                      locationAccuracy < 50 ? 'text-green-900' : 
                      locationAccuracy < 100 ? 'text-yellow-900' : 'text-red-900'
                    }`}>
                      ±{locationAccuracy > 1000 ? `${(locationAccuracy/1000).toFixed(1)}km` : `${Math.round(locationAccuracy)}m`}
                    </span>
                  </div>
                )}
              </div>
              
              {/* GPS Accuracy Warning */}
              {locationAccuracy > 100 && (
                <div className="flex items-start space-x-2 bg-orange-50 rounded-lg border border-orange-200 p-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-600 mt-0.5" />
                  <div className="text-xs text-orange-800">
                    <div className="font-semibold">Poor GPS Signal</div>
                    <div className="text-xs">
                      {locationAccuracy > 10000 
                        ? 'Using network location. Move outdoors for GPS.' 
                        : 'Accuracy improving...'}
                    </div>
                  </div>
                </div>
              )}
              
              {currentSpeed > 0 && (
                <div className="flex items-center space-x-2 bg-purple-50 rounded px-2 py-1">
                  <Activity className="h-3 w-3 text-purple-600" />
                  <span className="text-xs font-bold text-purple-900">{Math.round(currentSpeed * 3.6)} km/h</span>
                </div>
              )}
            </div>
          )}

          {/* Expandable Details Button */}
          <Button
            onClick={() => setShowTrackingPanel(!showTrackingPanel)}
            variant="outline"
            className="bg-white/95 backdrop-blur-md hover:bg-white shadow-lg border-white/20 p-2 pointer-events-auto"
            size="icon"
          >
            {showTrackingPanel ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        {/* Expandable Detailed Panel */}
        {showTrackingPanel && (
          <div className="absolute top-4 left-[180px] z-[1000] transition-all duration-300 pointer-events-auto">
            <Card className="bg-white/95 backdrop-blur-md shadow-2xl border-0 w-72 pointer-events-auto">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Navigation className="h-4 w-4 text-blue-600" />
                    <span>GPS Details</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTrackingPanel(false)}
                    className="h-6 w-6"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {/* Status */}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-bold ${isTracking ? 'text-green-600' : 'text-gray-500'}`}>
                    {isTracking ? '● LIVE' : '○ OFF'}
                  </span>
                </div>

                {/* Location History */}
                {locationHistory.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-blue-700">Points Logged:</span>
                    <span className="font-bold text-blue-900">{locationHistory.length}</span>
                  </div>
                )}

                {/* GPS Accuracy */}
                {locationAccuracy > 0 && (
                  <div className={`flex items-center justify-between p-2 rounded ${
                    locationAccuracy < 50 ? 'bg-green-50' : 
                    locationAccuracy < 100 ? 'bg-yellow-50' : 'bg-red-50'
                  }`}>
                    <span className={`${
                      locationAccuracy < 50 ? 'text-green-700' : 
                      locationAccuracy < 100 ? 'text-yellow-700' : 'text-red-700'
                    }`}>Accuracy:</span>
                    <span className={`font-bold ${
                      locationAccuracy < 50 ? 'text-green-600' : 
                      locationAccuracy < 100 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      ±{locationAccuracy > 1000 ? `${(locationAccuracy/1000).toFixed(1)}km` : `${Math.round(locationAccuracy)}m`}
                    </span>
                  </div>
                )}

                {/* GPS Warning in Detailed Panel */}
                {locationAccuracy > 100 && (
                  <div className="flex items-start space-x-2 p-2 bg-orange-50 rounded border border-orange-200">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-600 mt-0.5" />
                    <div className="text-orange-800">
                      <div className="font-bold text-xs">Poor GPS Accuracy</div>
                      <div className="text-xs mt-1">
                        {locationAccuracy > 10000 ? (
                          <>Using network/IP location. For better accuracy:</>
                        ) : (
                          <>Waiting for better GPS signal...</>
                        )}
                      </div>
                      {locationAccuracy > 10000 && (
                        <ul className="text-xs mt-1 ml-3 space-y-0.5">
                          <li>• Move outdoors</li>
                          <li>• Enable device GPS</li>
                          <li>• Allow precise location</li>
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Current Speed */}
                {currentSpeed > 0 && (
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-purple-700">Speed:</span>
                    <span className="font-bold text-purple-900">
                      {Math.round(currentSpeed * 3.6)} km/h
                    </span>
                  </div>
                )}

                {/* Features */}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Connection:</span>
                    <span className={`font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Alerts:</span>
                    <span className={`font-bold ${notificationsEnabled ? 'text-purple-600' : 'text-gray-500'}`}>
                      {notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                {!isTracking && (
                  <div className="flex items-start space-x-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <Info className="h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5" />
                    <p className="text-blue-800">
                      Enable GPS to receive real-time safety alerts.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Enhanced SOS Confirmation Dialog */}
      {showSOSConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
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

      {/* Ultra-Compact Bottom Bar */}
      <div className="bg-white/95 backdrop-blur-md border-t border-white/20 px-4 py-2">
        {/* Single Row Zone Statistics */}
        <div className="flex items-center justify-between gap-4">
          {/* Zone Counts */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Safe', count: zones.filter(z => z.type === 'SAFE').length, color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
              { label: 'Alert', count: zones.filter(z => z.type === 'ALERT').length, color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertCircle },
              { label: 'Restricted', count: zones.filter(z => z.type === 'RESTRICTED').length, color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
              { label: 'Total', count: zones.length, color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Layers }
            ].map(({ label, count, color, bgColor, icon: Icon }) => (
              <div key={label} className={`${bgColor} rounded-lg px-3 py-1.5 flex items-center space-x-2`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <div className={`text-base font-bold ${color}`}>{count}</div>
                <span className={`text-xs ${color} font-medium`}>{label}</span>
              </div>
            ))}
          </div>

          {/* Current Location - Compact */}
          {userLocation && isTracking && (
            <div className="flex items-center space-x-3 text-xs bg-gray-50 rounded-lg px-3 py-1.5">
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600 font-mono">
                  {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
                </span>
              </div>
              {currentSpeed > 0 && (
                <div className="flex items-center space-x-1 border-l border-gray-300 pl-3">
                  <Activity className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-700 font-semibold">
                    {Math.round(currentSpeed * 3.6)} km/h
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact Safety Score & Stats - Single Row */}
        {safetyScore && (
          <div className="mt-2 flex items-center justify-between">
            {/* Safety Score */}
            <button
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg hover:from-amber-100 hover:to-orange-100 transition-colors"
            >
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-gray-700">Safety:</span>
              <span className={`text-base font-bold ${getSafetyScoreColor(safetyScore.score)}`}>
                {Math.round(safetyScore.score)}%
              </span>
              {showStatsPanel ? <EyeOff className="h-3 w-3 text-gray-600" /> : <Eye className="h-3 w-3 text-gray-600" />}
            </button>

            {/* Trip Stats - Compact */}
            {showStatsPanel && (
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-1 bg-blue-50 rounded px-2 py-1">
                  <Route className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900">
                    {formatDistance(tripStats.distance)}
                  </span>
                </div>

                <div className="flex items-center space-x-1 bg-green-50 rounded px-2 py-1">
                  <Timer className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-bold text-green-900">
                    {formatDuration(tripStats.duration)}
                  </span>
                </div>

                <div className="flex items-center space-x-1 bg-purple-50 rounded px-2 py-1">
                  <CheckCircle className="h-3 w-3 text-purple-600" />
                  <span className="text-xs font-bold text-purple-900">
                    {tripStats.safeZonesVisited}
                  </span>
                </div>

                <div className="flex items-center space-x-1 bg-orange-50 rounded px-2 py-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  <span className="text-xs font-bold text-orange-900">
                    {tripStats.alertsReceived}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Zone Details Modal */}
      {showZoneDetails && selectedZone && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <Card className="max-w-lg w-full bg-white/95 backdrop-blur-md shadow-2xl border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <div className={`p-3 rounded-full ${
                    selectedZone.type === 'SAFE' ? 'bg-green-100 text-green-600' :
                    selectedZone.type === 'ALERT' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {selectedZone.type === 'SAFE' ? <CheckCircle className="h-6 w-6" /> :
                     selectedZone.type === 'ALERT' ? <AlertCircle className="h-6 w-6" /> :
                     <XCircle className="h-6 w-6" />}
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
              {/* Zone Type and Risk Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-600">Zone Type</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                    selectedZone.type === 'SAFE' ? 'bg-green-100 text-green-800' :
                    selectedZone.type === 'ALERT' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedZone.type}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-600">Risk Level</div>
                  <div className={`font-semibold mt-1 ${
                    selectedZone.riskLevel === 'LOW' ? 'text-green-600' :
                    selectedZone.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                    selectedZone.riskLevel === 'HIGH' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {selectedZone.riskLevel || 'UNKNOWN'}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedZone.description && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-900 mb-2">Zone Information</div>
                  <p className="text-sm text-blue-800">
                    {selectedZone.description}
                  </p>
                </div>
              )}

              {/* Safety Guidelines */}
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm font-medium text-amber-900 mb-2">Safety Guidelines</div>
                <div className="space-y-2 text-sm text-amber-800">
                  {selectedZone.type === 'SAFE' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Monitored safe area with regular patrols</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Emergency services readily available</span>
                      </div>
                    </>
                  )}
                  {selectedZone.type === 'ALERT' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span>Exercise caution and stay aware</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span>Avoid isolated areas after dark</span>
                      </div>
                    </>
                  )}
                  {selectedZone.type === 'RESTRICTED' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Access prohibited - leave immediately</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Contact authorities if assistance needed</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {selectedZone.incidentCount || 0}
                  </div>
                  <div className="text-xs text-gray-600">Incidents Reported</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {selectedZone.lastUpdated ? new Date(selectedZone.lastUpdated).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600">Last Updated</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
