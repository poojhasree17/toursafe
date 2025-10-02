'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface IncidentDetail {
  id: string;
  type: string;
  severity: string;
  tourist: string;
  location: string;
  status: string;
  timestamp: string;
  description: string;
  lat?: number;
  lng?: number;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'location' | 'timeline'>('overview');

  useEffect(() => {
    loadIncidentDetails();
  }, [incidentId]);

  const loadIncidentDetails = async () => {
    try {
      setLoading(true);
      // Mock detailed incident data
      const mockIncident: IncidentDetail = {
        id: incidentId,
        type: 'RESTRICTED',
        severity: 'MEDIUM',
        tourist: 'Bob Explorer',
        location: '18.9248, 72.8378',
        status: 'OPEN',
        timestamp: '2 minutes ago',
        description: 'Tourist approaching restricted naval area',
        lat: 18.9248,
        lng: 72.8378,
        assignedTo: '',
        notes: 'Tourist appears to be unaware of restricted zone boundaries.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIncident(mockIncident);
    } catch (error) {
      console.error('Failed to load incident details:', error);
      toast.error('Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Incident Not Found</h2>
          <p className="text-gray-600 mb-4">The requested incident could not be found.</p>
          <Link href="/admin/incidents">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Back to Incidents
            </button>
          </Link>
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
              <Link href="/admin/incidents" className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Incident Details</h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                incident.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                incident.status === 'ACKNOWLEDGED' ? 'bg-yellow-100 text-yellow-800' :
                incident.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {incident.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Tab Navigation */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('location')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'location'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Location & Map
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Timeline
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Incident Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Incident Information</h3>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Incident Type</dt>
                        <dd className="mt-1 text-sm text-gray-900">{incident.type}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Severity</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            incident.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                            incident.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {incident.severity}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tourist</dt>
                        <dd className="mt-1 text-sm text-gray-900">{incident.tourist}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{incident.location}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reported</dt>
                        <dd className="mt-1 text-sm text-gray-900">{new Date(incident.createdAt).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd className="mt-1 text-sm text-gray-900">{new Date(incident.updatedAt).toLocaleString()}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                    <p className="text-sm text-gray-700">{incident.description}</p>
                    {incident.notes && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{incident.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Sidebar */}
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
                    <div className="space-y-3">
                      {incident.status === 'OPEN' && (
                        <button
                          onClick={() => {
                            toast.success('Incident acknowledged');
                            setIncident(prev => prev ? {...prev, status: 'ACKNOWLEDGED'} : null);
                          }}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                        >
                          Acknowledge
                        </button>
                      )}

                      <button
                        onClick={() => {
                          toast('Assignment modal would open here');
                          setIncident(prev => prev ? {...prev, status: 'ASSIGNED', assignedTo: 'Emergency Response Team'} : null);
                        }}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Assign Responder
                      </button>

                      <button
                        onClick={() => toast('Emergency services notification sent')}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Escalate to Emergency
                      </button>
                    </div>
                  </div>
                </div>

                {incident.assignedTo && (
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment</h3>
                      <div className="text-sm text-gray-700">
                        <p><strong>Assigned to:</strong> {incident.assignedTo}</p>
                        <p><strong>Assigned at:</strong> {new Date().toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Latitude</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{incident.lat}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Longitude</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{incident.lng}</dd>
                    </div>
                  </div>

                  <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Interactive Map</h3>
                      <p className="mt-1 text-sm text-gray-500">Map integration would be implemented here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Incident Timeline</h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    <li>
                      <div className="relative pb-8">
                        <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Incident reported - <span className="font-medium text-gray-900">{incident.type}</span>
                              </p>
                              <p className="text-xs text-gray-400">Tourist: {incident.tourist}</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time>{new Date(incident.createdAt).toLocaleString()}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>

                    {incident.status !== 'OPEN' && (
                      <li>
                        <div className="relative pb-8">
                          <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
                                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Status changed to <span className="font-medium text-gray-900">{incident.status}</span>
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time>{new Date(incident.updatedAt).toLocaleString()}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

