'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, Upload, QrCode, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStoredVC, storeVC } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function TouristPage() {
  const [vcJwt, setVcJwt] = useState('');
  const [hasVC, setHasVC] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedVC = getStoredVC();
    if (storedVC) {
      setHasVC(true);
      setVcJwt(storedVC);
    }
  }, []);

  const handleVCImport = async () => {
    if (!vcJwt.trim()) {
      toast.error('Please paste your VC JWT');
      return;
    }

    setLoading(true);
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
      setHasVC(true);
      toast.success('Credential imported successfully!');
      
      // Navigate to map
      setTimeout(() => {
        router.push('/tourist/map');
      }, 1000);

    } catch (error) {
      console.error('VC import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import VC');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoVC = async () => {
    setLoading(true);
    try {
      // Issue a demo VC
      const response = await fetch('/api/v1/vc/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Demo Tourist',
          emergencyContact: '+1234567890'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to issue demo VC');
      }

      setVcJwt(result.vcJwt);
      storeVC(result.vcJwt);
      setHasVC(true);
      toast.success('Demo credential created!');
      
      // Navigate to map
      setTimeout(() => {
        router.push('/tourist/map');
      }, 1000);

    } catch (error) {
      console.error('Demo VC error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create demo VC');
    } finally {
      setLoading(false);
    }
  };

  if (hasVC) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <CardTitle>Credential Verified</CardTitle>
                <CardDescription>
                  Your tourist credential is active and verified
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Button 
                  onClick={() => router.push('/tourist/map')}
                  className="w-full"
                  size="lg"
                >
                  Open Safety Map
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/tourist/settings')}
                  className="w-full"
                >
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tourist Safety</h1>
            <p className="text-gray-600">
              Import your verifiable credential to start safe travels
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Import Credential
              </CardTitle>
              <CardDescription>
                Paste your VC JWT or scan a QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Verifiable Credential (JWT)
                </label>
                <textarea
                  className="w-full p-3 border rounded-md resize-none h-24 text-sm font-mono"
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
                  value={vcJwt}
                  onChange={(e) => setVcJwt(e.target.value)}
                />
              </div>

              <Button
                onClick={handleVCImport}
                disabled={loading || !vcJwt.trim()}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Import Credential'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleDemoVC}
                disabled={loading}
                className="w-full"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Use Demo Credential
              </Button>
            </CardContent>
          </Card>

          <div className="mt-8 p-4 bg-amber-50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Demo Mode</p>
                <p>This demo uses test credentials. In production, credentials would be issued by authorized tourism authorities.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
