'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, Download, Copy, CheckCircle, AlertCircle, QrCode, Plus, Trash2, Calendar, MapPin, User, Phone, Mail, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../../lib/auth';

interface KYCInfo {
  type: 'aadhaar' | 'passport' | 'other';
  number: string;
  country?: string;
  expiryDate?: string;
}

interface TripItinerary {
  arrivalDate: string;
  departureDate: string;
  destinations: string[];
  purpose?: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

interface EntryPoint {
  type: 'airport' | 'hotel' | 'check-post' | 'other';
  name: string;
  location: string;
  timestamp: string;
}

export default function TouristIDPage() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    nationality: '',
    kycInfo: {
      type: 'passport' as KYCInfo['type'],
      number: '',
      country: '',
      expiryDate: ''
    },
    tripItinerary: {
      arrivalDate: '',
      departureDate: '',
      destinations: [''],
      purpose: ''
    },
    emergencyContacts: [
      {
        name: '',
        relationship: '',
        phone: '',
        email: ''
      }
    ],
    entryPoint: {
      type: 'airport' as EntryPoint['type'],
      name: '',
      location: '',
      timestamp: new Date().toISOString().slice(0, 16)
    }
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

  const addDestination = () => {
    setFormData(prev => ({
      ...prev,
      tripItinerary: {
        ...prev.tripItinerary,
        destinations: [...prev.tripItinerary.destinations, '']
      }
    }));
  };

  const updateDestination = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      tripItinerary: {
        ...prev.tripItinerary,
        destinations: prev.tripItinerary.destinations.map((dest, i) => i === index ? value : dest)
      }
    }));
  };

  const removeDestination = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tripItinerary: {
        ...prev.tripItinerary,
        destinations: prev.tripItinerary.destinations.filter((_, i) => i !== index)
      }
    }));
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        { name: '', relationship: '', phone: '', email: '' }
      ]
    }));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName || !formData.nationality) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.tripItinerary.arrivalDate) >= new Date(formData.tripItinerary.departureDate)) {
      toast.error('Departure date must be after arrival date');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/tourist-id/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setVcResult(result);
        toast.success('Tourist ID issued successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to issue Tourist ID');
      }
    } catch (error) {
      console.error('Tourist ID issuance failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to issue Tourist ID');
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
              <h1 className="text-2xl font-bold text-gray-900">Digital Tourist ID</h1>
            </div>
            <div className="text-sm text-gray-500">
              Issue Secure Tourist Credentials
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Tourist ID Issuance Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Issue New Digital Tourist ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter tourist's full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="tourist@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., United States"
                      required
                    />
                  </div>
                </div>

                {/* KYC Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    KYC Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Type
                      </label>
                      <select
                        value={formData.kycInfo.type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          kycInfo: { ...prev.kycInfo, type: e.target.value as KYCInfo['type'] }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="passport">Passport</option>
                        <option value="aadhaar">Aadhaar</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Number
                      </label>
                      <input
                        type="text"
                        value={formData.kycInfo.number}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          kycInfo: { ...prev.kycInfo, number: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter ID number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country of Issue
                      </label>
                      <input
                        type="text"
                        value={formData.kycInfo.country}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          kycInfo: { ...prev.kycInfo, country: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., United States"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.kycInfo.expiryDate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          kycInfo: { ...prev.kycInfo, expiryDate: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Trip Itinerary */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Trip Itinerary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arrival Date *
                      </label>
                      <input
                        type="date"
                        value={formData.tripItinerary.arrivalDate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tripItinerary: { ...prev.tripItinerary, arrivalDate: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departure Date *
                      </label>
                      <input
                        type="date"
                        value={formData.tripItinerary.departureDate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tripItinerary: { ...prev.tripItinerary, departureDate: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destinations
                    </label>
                    {formData.tripItinerary.destinations.map((destination, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => updateDestination(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Destination ${index + 1}`}
                        />
                        {formData.tripItinerary.destinations.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeDestination(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDestination}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Destination
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trip Purpose
                    </label>
                    <input
                      type="text"
                      value={formData.tripItinerary.purpose}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tripItinerary: { ...prev.tripItinerary, purpose: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Business, Leisure, Medical"
                    />
                  </div>
                </div>

                {/* Emergency Contacts */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Emergency Contacts
                  </h3>
                  {formData.emergencyContacts.map((contact, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Contact name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Relationship
                          </label>
                          <input
                            type="text"
                            value={contact.relationship}
                            onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Family, Friend"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone *
                          </label>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+1 (555) 123-4567"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={contact.email}
                            onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="contact@example.com"
                          />
                        </div>
                      </div>
                      {formData.emergencyContacts.length > 1 && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEmergencyContact(index)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmergencyContact}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Emergency Contact
                  </Button>
                </div>

                {/* Entry Point */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Entry Point Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entry Type
                      </label>
                      <select
                        value={formData.entryPoint.type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          entryPoint: { ...prev.entryPoint, type: e.target.value as EntryPoint['type'] }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="airport">Airport</option>
                        <option value="hotel">Hotel</option>
                        <option value="check-post">Check Post</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entry Point Name
                      </label>
                      <input
                        type="text"
                        value={formData.entryPoint.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          entryPoint: { ...prev.entryPoint, name: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Delhi Airport"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.entryPoint.location}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          entryPoint: { ...prev.entryPoint, location: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., New Delhi, India"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entry Timestamp
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.entryPoint.timestamp}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          entryPoint: { ...prev.entryPoint, timestamp: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Issuing Tourist ID...' : 'Issue Digital Tourist ID'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tourist ID Result */}
          {vcResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Digital Tourist ID Issued Successfully
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

                {/* Tourist ID Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tourist Display Name</h4>
                    <p className="p-2 bg-gray-100 rounded text-sm">{formData.displayName}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Nationality</h4>
                    <p className="p-2 bg-gray-100 rounded text-sm">{formData.nationality}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Valid Until</h4>
                    <p className="p-2 bg-gray-100 rounded text-sm">
                      {new Date(formData.tripItinerary.departureDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Entry Point</h4>
                    <p className="p-2 bg-gray-100 rounded text-sm">
                      {formData.entryPoint.name} ({formData.entryPoint.type})
                    </p>
                  </div>
                </div>

                {/* VC JWT */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tourist ID JWT Token</h4>
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
                        touristInfo: formData,
                        issuedAt: new Date().toISOString(),
                        blockchainTx: vcResult.chainTxHash
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `tourist-id-${formData.displayName.toLowerCase().replace(' ', '-')}.json`;
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
                        Store this Tourist ID JWT securely. Share it only with the authorized tourist.
                        The blockchain anchor provides tamper-proof verification. ID expires on departure date.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
