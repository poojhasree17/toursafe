'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, Upload, QrCode, CheckCircle, AlertCircle, Camera, Eye, EyeOff, Copy, RefreshCw, Info, Globe, Clock, User, Phone, Zap, MapPin, Activity, TrendingUp, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStoredVC, storeVC, calculateTouristSafetyScore } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function TouristPage() {
  const [vcJwt, setVcJwt] = useState('');
  const [hasVC, setHasVC] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [credentialInfo, setCredentialInfo] = useState<any>(null);
  const [showCredentialPreview, setShowCredentialPreview] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importMethod, setImportMethod] = useState<'paste' | 'qr' | 'demo'>('paste');
  const [safetyScore, setSafetyScore] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    const storedVC = getStoredVC();
    if (storedVC) {
      setHasVC(true);
      setVcJwt(storedVC);
      try {
        const parsed = parseJWT(storedVC);
        setCredentialInfo(parsed);
      } catch (error) {
        console.error('Failed to parse stored VC:', error);
      }
    }

    // Load safety zones for safety score calculation
    loadZones();
  }, []);

  // Load zones for safety score calculation
  const loadZones = async () => {
    try {
      const response = await fetch('/api/v1/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
      }
    } catch (error) {
      console.error('Failed to load zones:', error);
    }
  };

  // Calculate safety score when location changes
  useEffect(() => {
    if (userLocation && zones.length > 0) {
      const score = calculateTouristSafetyScore(
        { lat: userLocation[1], lng: userLocation[0] },
        zones,
        [],
        new Date()
      );
      setSafetyScore(score);
    }
  }, [userLocation, zones]);

  // Get user's current location for safety score
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation([longitude, latitude]); // [lng, lat] for the map component
    } catch (error) {
      console.error('Failed to get location:', error);
      toast.error('Unable to get your location for safety score calculation');
    }
  };

  const parseJWT = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      throw new Error('Failed to parse credential');
    }
  };

  const formatCredentialInfo = (payload: any) => {
    return {
      name: payload.displayName || payload.name || 'Tourist',
      emergencyContact: payload.emergencyContact || 'Not provided',
      issuedBy: payload.iss || 'Tourism Authority',
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toLocaleDateString() : 'Unknown',
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleDateString() : 'No expiration',
      credentialId: payload.jti || 'N/A'
    };
  };

  const simulateProgress = (callback: () => void) => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            callback();
            setProgress(100);
          }, 200);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 100);
  };

  const handleVCImport = async () => {
    if (!vcJwt.trim()) {
      toast.error('Please paste your VC JWT');
      return;
    }

    setLoading(true);
    simulateProgress(async () => {
      try {
        // Verify the VC with our API
        const response = await fetch('/api/v1/vc/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vcJwt: vcJwt.trim() })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to verify VC');
        }

        if (!result.isValid) {
          throw new Error('Invalid VC provided');
        }

        // Store the VC locally
        storeVC(vcJwt.trim());
        const parsed = parseJWT(vcJwt.trim());
        setCredentialInfo(formatCredentialInfo(parsed));
        setHasVC(true);
        toast.success('Credential imported successfully!');

        // Navigate to map
        setTimeout(() => {
          router.push('/tourist/map');
        }, 1000);

      } catch (error) {
        console.error('VC import error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to import VC');
        setProgress(0);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDemoVC = async () => {
    setLoading(true);
    simulateProgress(async () => {
      try {
        // Create a simple demo VC for testing
        const demoPayload = {
          iss: 'Demo Tourism Authority',
          sub: 'demo-tourist-123',
          aud: 'toursafe-app',
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
          iat: Math.floor(Date.now() / 1000),
          jti: 'demo-' + Date.now(),
          displayName: 'Demo Tourist',
          emergencyContact: '+1234567890',
          touristId: 'demo-tourist-' + Date.now(),
          name: 'Demo Tourist',
          type: 'tourist-credential'
        };

        // Create a simple JWT-like string for demo purposes
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify(demoPayload));
        const signature = btoa('demo-signature'); // Not a real signature, just for demo
        const demoVcJwt = `${header}.${payload}.${signature}`;

        setVcJwt(demoVcJwt);
        storeVC(demoVcJwt);
        setCredentialInfo(formatCredentialInfo(demoPayload));
        setHasVC(true);
        toast.success('Demo credential created!');

        // Navigate to map
        setTimeout(() => {
          router.push('/tourist/map');
        }, 1000);

      } catch (error) {
        console.error('Demo VC error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create demo VC');
        setProgress(0);
      } finally {
        setLoading(false);
      }
    });
  };

  const startQRScan = async () => {
    setScanning(true);
    setShowQRScanner(true);

    // Simulate QR scan for demo purposes
    setTimeout(() => {
      const mockQRData = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJkaXNwbGF5TmFtZSI6IkRlbW8gVG91cmlzdCIsImVtZXJnZW5jeUNvbnRhY3QiOiIrMTIzNDU2Nzg5MCIsImlzcyI6IkRlbW8gVG91cmlzbSBBdXRob3JpdHkiLCJpYXQiOjE2MzA4MzY4MDAsImV4cCI6MTY2MjM3MjgwMH0.mock_signature';
      setVcJwt(mockQRData);
      setShowQRScanner(false);
      setScanning(false);
      toast.success('QR Code scanned successfully!');
    }, 3000);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(vcJwt);
      toast.success('Credential copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const clearCredential = () => {
    setVcJwt('');
    setCredentialInfo(null);
    setShowCredentialPreview(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // SOS Alert functionality
  const sendSOSAlert = async (latitude: number, longitude: number) => {
    if (showSOSConfirm) {
      try {
        const response = await fetch('/api/v1/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourist_id: credentialInfo?.touristId || 'demo-tourist',
            type: 'SOS',
            lat: latitude,
            lng: longitude,
            severity: 'HIGH'
          })
        });

        if (response.ok) {
          setShowSOSConfirm(false);
          toast.success('🆘 SOS Alert Sent! Emergency services have been notified.', {
            duration: 5000,
            icon: '🚨'
          });
        } else {
          throw new Error(`Failed to send SOS: ${response.statusText}`);
        }
      } catch (error) {
        console.error('SOS failed:', error);
        toast.error('Failed to send SOS alert. Please contact emergency services directly.', {
          duration: 6000
        });
        setShowSOSConfirm(false);
      }
    } else {
      setShowSOSConfirm(true);
    }
  };

  const handleSOS = async () => {
    if (!userLocation) {
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
            maximumAge: 60000
          });
        });

        const { latitude, longitude } = position.coords;
        setUserLocation([longitude, latitude]);
        await sendSOSAlert(latitude, longitude);
      } catch (error) {
        console.error('Failed to get location for SOS:', error);
        toast.error('Unable to get your location. Please ensure location services are enabled.', { duration: 6000 });
        return;
      }
    } else {
      await sendSOSAlert(userLocation[1], userLocation[0]);
    }
  };

  const cancelSOS = () => {
    setShowSOSConfirm(false);
  };

  if (hasVC && credentialInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto">
            {/* Success Animation */}
            <div className="text-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <CheckCircle className="h-20 w-20 text-emerald-600 mx-auto mb-4 relative animate-bounce" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
              <p className="text-emerald-700 font-medium">Your tourist credential is active</p>
            </div>

            {/* Safety Score Card */}
            {safetyScore && (
              <Card className={`backdrop-blur-sm shadow-xl border-0 mb-6 ${
                safetyScore.score >= 80 ? 'bg-green-50/80' :
                safetyScore.score >= 60 ? 'bg-yellow-50/80' :
                safetyScore.score >= 40 ? 'bg-orange-50/80' : 'bg-red-50/80'
              }`}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg">
                    <Activity className={`h-5 w-5 mr-2 ${
                      safetyScore.score >= 80 ? 'text-green-600' :
                      safetyScore.score >= 60 ? 'text-yellow-600' :
                      safetyScore.score >= 40 ? 'text-orange-600' : 'text-red-600'
                    }`} />
                    Safety Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${
                      safetyScore.score >= 80 ? 'text-green-600' :
                      safetyScore.score >= 60 ? 'text-yellow-600' :
                      safetyScore.score >= 40 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {safetyScore.score}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      safetyScore.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
                      safetyScore.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      safetyScore.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {safetyScore.riskLevel} RISK
                    </div>
                    {!userLocation && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={getCurrentLocation}
                          className="text-xs"
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Update Location
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Credential Card */}
            <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0 mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <Shield className="h-5 w-5 mr-2 text-emerald-600" />
                    Tourist Credential
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCredentialPreview(!showCredentialPreview)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showCredentialPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showCredentialPreview ? (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">{credentialInfo.name}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{credentialInfo.emergencyContact}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Globe className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{credentialInfo.issuedBy}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span>Issued: {credentialInfo.issuedAt}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Info className="h-4 w-4 mr-2 text-gray-500" />
                      <span>Expires: {credentialInfo.expiresAt}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg">
                    <Shield className="h-8 w-8 text-emerald-600 mr-3" />
                    <div>
                      <p className="font-semibold text-emerald-900">{credentialInfo.name}</p>
                      <p className="text-sm text-emerald-700">Verified Tourist</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/tourist/map')}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3"
                size="lg"
              >
                <Shield className="h-5 w-5 mr-2" />
                Explore Safety Map
              </Button>

              {/* Emergency SOS Button */}
              <Button
                onClick={handleSOS}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 animate-pulse"
                size="lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                {showSOSConfirm ? 'Confirm SOS Alert' : 'Emergency SOS'}
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/tourist/settings')}
                className="w-full border-2 border-gray-200 hover:border-gray-300"
              >
                <Info className="h-4 w-4 mr-2" />
                Settings & Preferences
              </Button>
            </div>

            {/* Security Indicator */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified • Secure • Active
              </div>
            </div>
          </div>
        </div>

        {/* SOS Confirmation Dialog */}
        {showSOSConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <Card className="max-w-md w-full bg-white/95 backdrop-blur-md shadow-2xl border-0">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-red-900">Emergency SOS Alert</CardTitle>
                <CardDescription className="text-gray-600">
                  This will immediately notify emergency services and your registered contacts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-full">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-red-900">Emergency Contact</div>
                      <div className="text-sm text-red-700">{credentialInfo?.emergencyContact || 'Not provided'}</div>
                    </div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <Shield className="h-20 w-20 text-blue-600 mx-auto mb-4 relative" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tourist Safety
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Import your verifiable credential to unlock safe travel experiences
            </p>
          </div>

          {/* Import Method Selector */}
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0 mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-center">Choose Import Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={importMethod === 'paste' ? 'default' : 'outline'}
                  onClick={() => setImportMethod('paste')}
                  className={`flex flex-col items-center p-4 h-auto ${
                    importMethod === 'paste' ? 'bg-blue-600 text-white' : 'border-2'
                  }`}
                >
                  <Upload className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium">Paste JWT</span>
                </Button>
                <Button
                  variant={importMethod === 'qr' ? 'default' : 'outline'}
                  onClick={() => setImportMethod('qr')}
                  className={`flex flex-col items-center p-4 h-auto ${
                    importMethod === 'qr' ? 'bg-blue-600 text-white' : 'border-2'
                  }`}
                >
                  <Camera className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium">Scan QR</span>
                </Button>
                <Button
                  variant={importMethod === 'demo' ? 'default' : 'outline'}
                  onClick={() => setImportMethod('demo')}
                  className={`flex flex-col items-center p-4 h-auto ${
                    importMethod === 'demo' ? 'bg-blue-600 text-white' : 'border-2'
                  }`}
                >
                  <QrCode className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium">Try Demo</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Interface */}
          <Card className="backdrop-blur-sm bg-white/90 shadow-xl border-0 mb-6">
            <CardContent className="p-6">
              {importMethod === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-700">
                      Verifiable Credential (JWT)
                    </label>
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none h-32 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
                        value={vcJwt}
                        onChange={(e) => setVcJwt(e.target.value)}
                      />
                      {vcJwt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearCredential}
                          className="absolute top-2 right-2 h-8 w-8 p-0"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleVCImport}
                      disabled={loading || !vcJwt.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import Credential
                        </>
                      )}
                    </Button>
                    {vcJwt && (
                      <Button
                        variant="outline"
                        onClick={copyToClipboard}
                        className="px-3"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {importMethod === 'qr' && (
                <div className="text-center space-y-4">
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                    {showQRScanner ? (
                      <div className="space-y-4">
                        <div className="animate-pulse">
                          <Camera className="h-16 w-16 text-blue-500 mx-auto" />
                        </div>
                        <p className="text-sm text-gray-600">Scanning for QR code...</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: '60%' }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Scan QR code containing your credential</p>
                        <Button
                          onClick={startQRScan}
                          disabled={scanning}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          {scanning ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Starting Camera...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              Start QR Scanner
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {importMethod === 'demo' && (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                    <QrCode className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Try Demo Mode</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Experience the app with a test credential
                    </p>
                    <Button
                      onClick={handleDemoVC}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Demo...
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4 mr-2" />
                          Get Demo Credential
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {loading && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing credential...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="backdrop-blur-sm bg-amber-50/80 border-amber-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 mb-1">Demo Mode Active</p>
                  <p className="text-amber-800">
                    This demo uses test credentials. In production, credentials would be issued by authorized tourism authorities and verified through secure channels.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
