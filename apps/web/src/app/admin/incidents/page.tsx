'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

interface Incident {
  id: string;
  type: string;
  severity: string;
  tourist: string;
  location: string;
  status: string;
  timestamp: string;
  description: string;
}

export default function IncidentsPage() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'efirs'>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const router = useRouter();

  // Load incidents on component mount
  useEffect(() => {
    loadIncidents();
  }, []);

  const handleRefreshIncidents = () => {
    loadIncidents();
  };


  const loadIncidents = async () => {
    try {
      setLoading(true);
      // For demo purposes, we'll use mock data that matches the API structure
      // In production, this would fetch from your Supabase API
      const mockIncidents: Incident[] = [
        {
          id: '1',
          type: 'RESTRICTED',
          severity: 'MEDIUM',
          tourist: 'Bob Explorer',
          location: '18.9248, 72.8378',
          status: 'OPEN',
          timestamp: '2 minutes ago',
          description: 'Tourist approaching restricted naval area'
        },
        {
          id: '2',
          type: 'SOS',
          severity: 'HIGH',
          tourist: 'Alice Tourist',
          location: '18.9200, 72.8400',
          status: 'ACK',
          timestamp: '5 minutes ago',
          description: 'Emergency SOS alert received'
        },
        {
          id: '3',
          type: 'IMMOBILE',
          severity: 'HIGH',
          tourist: 'Charlie Visitor',
          location: '18.9250, 72.8350',
          status: 'CLOSED',
          timestamp: '10 minutes ago',
          description: 'Tourist has been immobile for 8 minutes'
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIncidents(mockIncidents);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (incidentId: string) => {
    try {
      setActionLoading(incidentId);

      // Update incident status to ACK in database
      const { error } = await supabase
        .from('incidents')
        .update({ status: 'ACK' })
        .eq('id', incidentId);

      if (error) throw error;

      // Update local state
      setIncidents(prev => prev.map(incident =>
        incident.id === incidentId
          ? { ...incident, status: 'ACK' }
          : incident
      ));

      toast.success('Incident acknowledged successfully');
    } catch (error) {
      console.error('Failed to acknowledge incident:', error);
      toast.error('Failed to acknowledge incident');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async (incidentId: string) => {
    try {
      setActionLoading(incidentId);

      // In a real implementation, this would open an assignment modal
      // For demo purposes, we'll update the status directly
      toast('Assigning responder to incident...', {
        duration: 2000,
      });

      // Update incident status to CLOSED in database (since there's no ASSIGNED status)
      const { error } = await supabase
        .from('incidents')
        .update({ status: 'CLOSED' })
        .eq('id', incidentId);

      if (error) throw error;

      // Update local state
      setIncidents(prev => prev.map(incident =>
        incident.id === incidentId
          ? { ...incident, status: 'CLOSED' }
          : incident
      ));

      toast.success('Incident closed successfully');
    } catch (error) {
      console.error('Failed to assign incident:', error);
      toast.error('Failed to assign incident');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDetails = (incidentId: string) => {
    // Navigate to detailed incident view
    router.push(`/admin/incidents/${incidentId}`);
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesType = typeFilter === 'all' || incident.type === typeFilter;
    return matchesStatus && matchesType;
  });

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
              <h1 className="text-2xl font-bold text-gray-900">Incident Management</h1>
            </div>
            <div className="text-sm text-gray-500">
              {filteredIncidents.filter(i => i.status === 'OPEN' || i.status === 'ACKNOWLEDGED').length} Active Incidents
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
                onClick={() => setActiveTab('incidents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'incidents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Incidents
              </button>
              <button
                onClick={() => setActiveTab('efirs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'efirs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                E-FIR Management
              </button>
            </nav>
          </div>

          {activeTab === 'incidents' && (
            <>
              {/* Filters */}
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="all">All Incidents</option>
                        <option value="OPEN">Open</option>
                        <option value="ACK">Acknowledged</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Type:</span>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="all">All Types</option>
                        <option value="SOS">SOS Alert</option>
                        <option value="RESTRICTED">Restricted Area</option>
                        <option value="IMMOBILE">Immobile</option>
                        <option value="DEVIATION">Route Deviation</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incidents List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Incidents</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleRefreshIncidents}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                      <Link href="/admin/incidents" className="text-blue-600 hover:text-blue-800">
                        View All
                      </Link>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading incidents...</p>
                      </div>
                    ) : filteredIncidents.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          {incidents.length === 0 ? 'No incidents' : 'No incidents match filters'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {incidents.length === 0
                            ? 'All tourists are safe and no incidents have been reported.'
                            : 'Try adjusting your filter criteria.'
                          }
                        </p>
                      </div>
                    ) : (
                      filteredIncidents.map((incident) => (
                        <div key={incident.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-3 w-3 rounded-full ${
                              incident.status === 'OPEN' ? 'bg-red-400' :
                              incident.status === 'ACK' ? 'bg-yellow-400' : 'bg-green-400'
                            }`}></div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">
                                  {incident.type} - {incident.tourist}
                                </p>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  incident.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                                  incident.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {incident.severity}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-gray-500">
                                {incident.description}
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                {incident.timestamp}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {incident.status === 'OPEN' && (
                              <>
                                <button
                                  onClick={() => handleAcknowledge(incident.id)}
                                  disabled={actionLoading === incident.id}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50"
                                >
                                  {actionLoading === incident.id ? '...' : 'Acknowledge'}
                                </button>
                                <button
                                  onClick={() => handleAssign(incident.id)}
                                  disabled={actionLoading === incident.id}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {actionLoading === incident.id ? '...' : 'Close'}
                                </button>
                              </>
                            )}
                            {incident.status === 'ACK' && (
                              <button
                                onClick={() => handleAssign(incident.id)}
                                disabled={actionLoading === incident.id}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                              >
                                {actionLoading === incident.id ? '...' : 'Close'}
                              </button>
                            )}
                            {incident.status === 'CLOSED' && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                                {incident.status}
                              </span>
                            )}
                            <button
                              onClick={() => handleDetails(incident.id)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'efirs' && (
            <div className="space-y-6">
              {/* E-FIR Management - Placeholder for now */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">E-FIR Management</h3>
                  <p className="text-sm text-gray-600">
                    E-FIR management interface would be implemented here with search, filtering, and bulk operations.
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    Note: EFIRGenerator component temporarily disabled due to JSX parsing issues.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
