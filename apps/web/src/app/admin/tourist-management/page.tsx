'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, Search, Filter, Eye, Ban, AlertTriangle, CheckCircle, Clock, MapPin, User, Calendar, Phone, Mail, Globe, RefreshCw, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../../lib/auth';

interface Tourist {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  nationality: string;
  active: boolean;
  issuedAt: string;
  expiresAt?: string;
  entryPoint?: {
    type: string;
    name: string;
    location: string;
  };
  kycInfo?: {
    type: string;
    number?: string;
  };
  tripItinerary?: {
    arrivalDate: string;
    departureDate: string;
    destinations: string[];
  };
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
  }>;
  hasValidVC: boolean;
}

export default function TouristManagementPage() {
  const [user, setUser] = useState<any>(null);
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [filteredTourists, setFilteredTourists] = useState<Tourist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedTourist, setSelectedTourist] = useState<Tourist | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [renewalForm, setRenewalForm] = useState({
    newDepartureDate: '',
    reason: ''
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load tourists data
  useEffect(() => {
    if (isAuthenticated) {
      loadTourists();
    }
  }, [isAuthenticated]);

  // Filter tourists based on search and filters
  useEffect(() => {
    filterTourists();
  }, [tourists, searchTerm, nationalityFilter, statusFilter]);

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

  const loadTourists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/tourist-id/list');

      if (response.ok) {
        const data = await response.json();
        setTourists(data.tourists || []);
      } else {
        throw new Error('Failed to load tourists');
      }
    } catch (error) {
      console.error('Failed to load tourists:', error);
      toast.error('Failed to load tourist data');
    } finally {
      setLoading(false);
    }
  };

  const filterTourists = () => {
    let filtered = tourists;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tourist =>
        tourist.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tourist.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tourist.nationality.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Nationality filter
    if (nationalityFilter) {
      filtered = filtered.filter(tourist =>
        tourist.nationality.toLowerCase().includes(nationalityFilter.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(tourist => {
        if (statusFilter === 'active') {
          return tourist.active && (!tourist.expiresAt || new Date(tourist.expiresAt) > now);
        } else if (statusFilter === 'expired') {
          return tourist.expiresAt && new Date(tourist.expiresAt) <= now;
        }
        return true;
      });
    }

    setFilteredTourists(filtered);
  };

  const handleViewDetails = (tourist: Tourist) => {
    setSelectedTourist(tourist);
    setShowDetails(true);
  };

  const handleRevokeTourist = async (touristId: string) => {
    if (!confirm('Are you sure you want to revoke this tourist ID?')) return;

    try {
      const response = await fetch('/api/v1/tourist-id/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId,
          reason: 'Administrative revocation'
        })
      });

      if (response.ok) {
        toast.success('Tourist ID revoked successfully');
        loadTourists(); // Refresh the list
      } else {
        throw new Error('Failed to revoke tourist ID');
      }
    } catch (error) {
      console.error('Failed to revoke tourist:', error);
      toast.error('Failed to revoke tourist ID');
    }
  };

  const handleRenewTourist = async (touristId: string) => {
    if (!renewalForm.newDepartureDate) {
      toast.error('Please select a new departure date');
      return;
    }

    try {
      const response = await fetch('/api/v1/tourist-id/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId,
          newDepartureDate: renewalForm.newDepartureDate,
          reason: renewalForm.reason || 'Trip extension'
        })
      });

      if (response.ok) {
        toast.success('Tourist ID renewed successfully');
        setShowRenewalForm(false);
        setRenewalForm({ newDepartureDate: '', reason: '' });
        loadTourists(); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to renew tourist ID');
      }
    } catch (error) {
      console.error('Failed to renew tourist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to renew tourist ID');
    }
  };

  const verifyTouristID = async (vcJwt: string) => {
    try {
      const response = await fetch('/api/v1/tourist-id/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vcJwt })
      });

      const result = await response.json();

      if (result.isValid) {
        toast.success(`Tourist ID is valid${result.isExpired ? ' (expired)' : ''}`);
        return result;
      } else {
        toast.error(`Tourist ID verification failed: ${result.error}`);
        return null;
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Verification failed');
      return null;
    }
  };

  const getDaysUntilExpiry = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (tourist: Tourist) => {
    const daysUntilExpiry = getDaysUntilExpiry(tourist.expiresAt);

    if (!tourist.active) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Revoked</span>;
    }

    if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>;
    }

    if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    }

    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
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
              <h1 className="text-2xl font-bold text-gray-900">Tourist Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/admin/tourist-id">
                <Button>
                  <Shield className="h-4 w-4 mr-2" />
                  Issue New ID
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tourists..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <select
                    value={nationalityFilter}
                    onChange={(e) => setNationalityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Nationalities</option>
                    <option value="United States">United States</option>
                    <option value="India">India</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'expired')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="expired">Expired Only</option>
                  </select>
                </div>

                <div>
                  <Button variant="outline" onClick={loadTourists} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tourists List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tourist IDs ({filteredTourists.length})</span>
                <Button variant="outline" size="sm" onClick={loadTourists}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading tourists...</p>
                </div>
              ) : filteredTourists.length === 0 ? (
                <div className="text-center py-8">
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No tourists found matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTourists.map((tourist) => {
                    const daysUntilExpiry = getDaysUntilExpiry(tourist.expiresAt);
                    return (
                      <div key={tourist.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900">{tourist.displayName}</h3>
                              {getStatusBadge(tourist)}
                              {tourist.hasValidVC && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                            </div>

                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Globe className="h-4 w-4 mr-2" />
                                {tourist.nationality}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {tourist.entryPoint?.name || 'Not specified'}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {tourist.expiresAt ?
                                  `Expires ${new Date(tourist.expiresAt).toLocaleDateString()}` :
                                  'No expiry'
                                }
                              </div>
                            </div>

                            {daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0 && (
                              <div className="mt-2 flex items-center text-yellow-600">
                                <Clock className="h-4 w-4 mr-1" />
                                <span className="text-sm">Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(tourist)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {tourist.active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeTourist(tourist.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tourist Details Modal */}
          {showDetails && selectedTourist && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Tourist Details: {selectedTourist.displayName}</span>
                    <Button variant="outline" size="sm" onClick={() => setShowDetails(false)}>
                      ✕
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {selectedTourist.displayName}</p>
                        <p><strong>Email:</strong> {selectedTourist.email || 'Not provided'}</p>
                        <p><strong>Phone:</strong> {selectedTourist.phone || 'Not provided'}</p>
                        <p><strong>Nationality:</strong> {selectedTourist.nationality}</p>
                        <p><strong>Status:</strong> {getStatusBadge(selectedTourist)}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Entry Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Entry Point:</strong> {selectedTourist.entryPoint?.name || 'Not specified'}</p>
                        <p><strong>Type:</strong> {selectedTourist.entryPoint?.type || 'Not specified'}</p>
                        <p><strong>Location:</strong> {selectedTourist.entryPoint?.location || 'Not specified'}</p>
                        <p><strong>Issued:</strong> {new Date(selectedTourist.issuedAt).toLocaleDateString()}</p>
                        {selectedTourist.expiresAt && (
                          <p><strong>Expires:</strong> {new Date(selectedTourist.expiresAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KYC Information */}
                  {selectedTourist.kycInfo && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">KYC Information</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <p><strong>ID Type:</strong> {selectedTourist.kycInfo.type || 'Not specified'}</p>
                          {selectedTourist.kycInfo.number && (
                            <p><strong>ID Number:</strong> {selectedTourist.kycInfo.number}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trip Itinerary */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Trip Itinerary</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <p><strong>Arrival:</strong> {selectedTourist.tripItinerary?.arrivalDate ?
                          new Date(selectedTourist.tripItinerary.arrivalDate).toLocaleDateString() :
                          'Not specified'}</p>
                        <p><strong>Departure:</strong> {selectedTourist.tripItinerary?.departureDate ?
                          new Date(selectedTourist.tripItinerary.departureDate).toLocaleDateString() :
                          'Not specified'}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm"><strong>Destinations:</strong></p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedTourist.tripItinerary?.destinations?.map((dest, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {dest}
                            </span>
                          )) || <span className="text-gray-500 text-sm">No destinations specified</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  {selectedTourist.emergencyContacts && selectedTourist.emergencyContacts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Emergency Contacts</h4>
                      <div className="space-y-2">
                        {selectedTourist.emergencyContacts.map((contact, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <p><strong>Name:</strong> {contact?.name || 'Not specified'}</p>
                              <p><strong>Relationship:</strong> {contact?.relationship || 'Not specified'}</p>
                              <p><strong>Phone:</strong> {contact?.phone || 'Not specified'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4 border-t">
                    {selectedTourist.active && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setShowRenewalForm(true)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Renew ID
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            handleRevokeTourist(selectedTourist.id);
                            setShowDetails(false);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Revoke ID
                        </Button>
                      </>
                    )}
                    <Button variant="outline" onClick={() => setShowDetails(false)}>
                      Close
                    </Button>
                  </div>

                  {/* Renewal Form */}
                  {showRenewalForm && (
                    <div className="border-t pt-6">
                      <h4 className="font-medium text-gray-900 mb-4">Renew Tourist ID</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Departure Date *
                          </label>
                          <input
                            type="date"
                            value={renewalForm.newDepartureDate}
                            onChange={(e) => setRenewalForm(prev => ({ ...prev, newDepartureDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason for Extension
                          </label>
                          <input
                            type="text"
                            value={renewalForm.reason}
                            onChange={(e) => setRenewalForm(prev => ({ ...prev, reason: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Trip extension, Medical reasons"
                          />
                        </div>

                        <div className="flex space-x-3">
                          <Button
                            onClick={() => handleRenewTourist(selectedTourist.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Confirm Renewal
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowRenewalForm(false);
                              setRenewalForm({ newDepartureDate: '', reason: '' });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
