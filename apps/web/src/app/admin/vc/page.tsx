'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, Download, Copy, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../../lib/auth';

export default function VCPage() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    emergencyContact: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [vcResult, setVcResult] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/admin/login');
        return;
      }
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName) {
      toast.error('Please enter a display name');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/vc/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setVcResult(result);
        toast.success('VC issued successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to issue VC');
      }
    } catch (error) {
      console.error('VC issuance failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to issue VC');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const generateQRCode = (vcJwt: string) => {
    // Simple QR code generation using a service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vcJwt)}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">VC Issuer</h1>
            </div>
            <div className="text-sm text-gray-500">
              Issue Verifiable Credentials
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* VC Issuance Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Issue New Verifiable Credential
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tourist's display name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact (Optional)
                  </label>
                  <input
                    id="emergencyContact"
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Issuing VC...' : 'Issue Verifiable Credential'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* VC Result */}
          {vcResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  VC Issued Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Blockchain Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Blockchain Anchored</h4>
                      <p className="text-sm text-blue-700">
                        Transaction Hash: <code className="font-mono">{vcResult.chainTxHash || 'Pending'}</code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* VC Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">VC Hash (SHA-256)</h4>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                        {vcResult.vcSha256}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(vcResult.vcSha256)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tourist Display Name</h4>
                    <p className="p-2 bg-gray-100 rounded text-sm">{formData.displayName}</p>
                  </div>
                </div>

                {/* VC JWT */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">VC JWT Token</h4>
                  <div className="flex items-start space-x-2">
                    <textarea
                      readOnly
                      value={vcResult.vcJwt}
                      className="flex-1 p-3 bg-gray-100 border rounded-md text-xs font-mono resize-none h-32"
                    />
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(vcResult.vcJwt)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const qrUrl = generateQRCode(vcResult.vcJwt);
                          window.open(qrUrl, '_blank');
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      const qrUrl = generateQRCode(vcResult.vcJwt);
                      window.open(qrUrl, '_blank');
                    }}
                    className="flex-1"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const data = {
                        vcJwt: vcResult.vcJwt,
                        displayName: formData.displayName,
                        issuedAt: new Date().toISOString(),
                        blockchainTx: vcResult.chainTxHash
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `vc-${formData.displayName.toLowerCase().replace(' ', '-')}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Store this VC JWT securely. Share it only with the authorized tourist.
                        The blockchain anchor provides tamper-proof verification.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">1. Fill the Form</h4>
                  <p>Enter the tourist's display name and optional emergency contact information.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">2. Issue VC</h4>
                  <p>Click "Issue Verifiable Credential" to generate a W3C-compliant VC with blockchain anchoring.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">3. Share with Tourist</h4>
                  <p>Provide the VC JWT to the tourist via secure channels. They can import it in the tourist app.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">4. Verification</h4>
                  <p>Tourists can verify their VC authenticity using the audit page or blockchain explorer.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
