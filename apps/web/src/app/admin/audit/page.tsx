'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, CheckCircle, XCircle, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../../lib/auth';

interface VerificationResult {
  isValid: boolean;
  onChainProof?: {
    txHash: string;
    matched: boolean;
  };
  credential?: any;
  error?: string;
}

export default function AuditPage() {
  const [user, setUser] = useState<any>(null);
  const [vcJwt, setVcJwt] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
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

  const handleVerify = async () => {
    if (!vcJwt.trim()) {
      toast.error('Please enter a VC JWT token');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch('/api/v1/vc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vcJwt: vcJwt.trim() })
      });

      if (response.ok) {
        const result = await response.json();
        setVerificationResult(result);
        toast.success(result.isValid ? 'VC verified successfully!' : 'VC verification failed');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }
    } catch (error) {
      console.error('VC verification failed:', error);
      setVerificationResult({
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      });
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
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
              <h1 className="text-2xl font-bold text-gray-900">Blockchain Audit</h1>
            </div>
            <div className="text-sm text-gray-500">
              Polygon Amoy Testnet
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* VC Verification Section */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Verify Credential
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Verify a tourist's verifiable credential against the blockchain anchor
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VC JWT Token
                  </label>
                  <textarea
                    value={vcJwt}
                    onChange={(e) => setVcJwt(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none h-32 font-mono text-sm"
                    placeholder="Paste the JWT token here (starts with eyJ...)"
                  />
                </div>

                <Button onClick={handleVerify} disabled={isVerifying} className="w-full">
                  {isVerifying ? 'Verifying...' : 'Verify on Blockchain'}
                </Button>
              </div>
            </div>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Verification Result
                </h3>

                <div className={`border rounded-lg p-4 mb-4 ${
                  verificationResult.isValid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {verificationResult.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        verificationResult.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {verificationResult.isValid ? 'Verification Successful' : 'Verification Failed'}
                      </h3>
                      <div className={`mt-2 text-sm ${
                        verificationResult.isValid ? 'text-green-700' : 'text-red-700'
                      }`}>
                        <p>
                          {verificationResult.isValid
                            ? 'The credential has been successfully verified against the blockchain anchor.'
                            : verificationResult.error || 'The credential could not be verified.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {verificationResult.isValid && verificationResult.credential && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">VC Hash</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                        {verificationResult.credential.vcSha256}
                      </dd>
                    </div>
                    {verificationResult.onChainProof?.txHash && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Transaction Hash</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <code className="font-mono break-all">
                              {verificationResult.onChainProof.txHash}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(verificationResult.onChainProof!.txHash)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <a
                              href={`https://amoy.polygonscan.com/tx/${verificationResult.onChainProof.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Issuer</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {verificationResult.credential.issuer || 'Unknown'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Subject</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {verificationResult.credential.credentialSubject?.displayName || 'Unknown'}
                      </dd>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Verifications */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Verifications
              </h3>
              
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              VC verification for <span className="font-medium text-gray-900">Alice Tourist</span>
                            </p>
                            <p className="text-xs text-gray-400 font-mono">Hash: e3b0c44...852b855</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>2 min ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  
                  <li>
                    <div className="relative pb-8">
                      <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              VC verification for <span className="font-medium text-gray-900">Bob Explorer</span>
                            </p>
                            <p className="text-xs text-gray-400 font-mono">Hash: a665a45...7a27ae3</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>5 min ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
