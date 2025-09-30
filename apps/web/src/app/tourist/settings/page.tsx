'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, ArrowLeft, Trash2, Download, Globe, Bell, MapPin, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStoredVC, clearStoredVC } from '../../../lib/utils';
import { FamilyTrackingSettings } from '../../../components/family-tracking';
import { IoTDeviceManager } from '../../../components/iot-device-manager';

export default function TouristSettingsPage() {
  const [vcJwt, setVcJwt] = useState<string | null>(null);
  const [touristId, setTouristId] = useState<string | null>(null);
  const [touristName, setTouristName] = useState<string>('Tourist');
  const [locationTracking, setLocationTracking] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');
  const [privateMode, setPrivateMode] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('');

  useEffect(() => {
    // Load stored VC and settings
    const storedVC = getStoredVC();
    setVcJwt(storedVC);

    // Parse VC to get tourist info
    if (storedVC) {
      try {
        const parts = storedVC.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setTouristId(payload.touristId || payload.jti);
          setTouristName(payload.displayName || payload.name || 'Tourist');
          setEmergencyContact(payload.emergencyContact || '');
        }
      } catch (error) {
        console.error('Failed to parse VC:', error);
      }
    }

    // Load settings from localStorage
    const settings = JSON.parse(localStorage.getItem('toursafe-settings') || '{}');
    setLocationTracking(settings.locationTracking ?? true);
    setNotifications(settings.notifications ?? true);
    setLanguage(settings.language || 'en');
    setPrivateMode(settings.privateMode ?? false);
  }, []);

  const saveSettings = () => {
    const settings = {
      locationTracking,
      notifications,
      language,
      privateMode,
      emergencyContact
    };
    localStorage.setItem('toursafe-settings', JSON.stringify(settings));
    toast.success('Settings saved');
  };

  const handleClearVC = () => {
    if (confirm('Are you sure you want to remove your credential? You will need to import it again.')) {
      clearStoredVC();
      setVcJwt(null);
      toast.success('Credential removed');
    }
  };

  const handleDownloadVC = () => {
    if (!vcJwt) return;

    const blob = new Blob([vcJwt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'toursafe-credential.jwt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Credential downloaded');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifications(true);
        toast.success('Notifications enabled');
      } else {
        setNotifications(false);
        toast.error('Notifications denied');
      }
      saveSettings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/tourist/map">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Credential Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Credential Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vcJwt ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Credential Active</span>
                  </div>
                  <span className="text-xs text-green-600">Verified</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleDownloadVC} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="destructive" onClick={handleClearVC} className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">No credential found</p>
                <Link href="/tourist">
                  <Button>Import Credential</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy & Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Privacy & Safety</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Location Tracking */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium">Location Tracking</div>
                  <div className="text-sm text-gray-600">Share your location for safety monitoring</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationTracking}
                  onChange={(e) => {
                    setLocationTracking(e.target.checked);
                    saveSettings();
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Private Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {privateMode ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                <div>
                  <div className="font-medium">Private Mode</div>
                  <div className="text-sm text-gray-600">Reduce data sharing and visibility</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={privateMode}
                  onChange={(e) => {
                    setPrivateMode(e.target.checked);
                    saveSettings();
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-gray-600">Receive safety alerts and warnings</div>
              </div>
              <Button
                variant={notifications ? "default" : "outline"}
                onClick={requestNotificationPermission}
              >
                {notifications ? "Enabled" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Language & Region</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  saveSettings();
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Emergency Phone Number</label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                onBlur={saveSettings}
                placeholder="+1234567890"
                className="w-full p-3 border rounded-md"
              />
              <p className="text-sm text-gray-600 mt-1">
                This number will be contacted in case of an emergency
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Family Tracking */}
        {touristId && (
          <FamilyTrackingSettings
            touristId={touristId}
            touristName={touristName}
          />
        )}

        {/* IoT Device Management */}
        {touristId && (
          <IoTDeviceManager
            touristId={touristId}
            touristName={touristName}
          />
        )}

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Version</span>
              <span>1.0.0-demo</span>
            </div>
            <div className="flex justify-between">
              <span>Build</span>
              <span>SIH-2025</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                These actions are permanent and cannot be undone.
              </p>
              <Button variant="destructive" onClick={handleClearVC}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
