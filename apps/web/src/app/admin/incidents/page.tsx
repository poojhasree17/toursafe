'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EFIRGenerator } from '../../../components/efir-generator';

export default function IncidentsPage() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'efirs'>('incidents');

  // Mock incident data
  const incidents = [
    {
      id: '1',
      type: 'RESTRICTED',
      severity: 'MEDIUM',
      tourist: 'Bob Explorer',
      location: '18.9248, 72.8378',
      status: 'OPEN',
      timestamp: '2 minutes ago',
      description: 'Tourist approaching restricted naval area'
    }
  ];

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
              {incidents.filter(i => i.status === 'OPEN').length} Open Incidents
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
                  <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="all">All Incidents</option>
                    <option value="open">Open</option>
                    <option value="ack">Acknowledged</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="all">All Types</option>
                    <option value="sos">SOS Alert</option>
                    <option value="restricted">Restricted Area</option>
                    <option value="immobile">Immobile</option>
                    <option value="deviation">Route Deviation</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Incidents List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {incidents.map((incident) => (
                <li key={incident.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${
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
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p>{incident.location}</p>
                            <span className="mx-2">•</span>
                            <p>{incident.timestamp}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {incident.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {incident.status === 'OPEN' && (
                          <>
                            <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200">
                              Acknowledge
                            </button>
                            <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700">
                              Assign
                            </button>
                          </>
                        )}
                        <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Empty State (if no incidents) */}
          {incidents.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No incidents</h3>
              <p className="mt-1 text-sm text-gray-500">All tourists are safe and no incidents have been reported.</p>
            </div>
          )}

          {activeTab === 'efirs' && (
            <div className="space-y-6">
              {/* E-FIR Generation for Admins - All tourists */}
              <EFIRGenerator
                touristId="admin-view" // Special case for admin viewing all E-FIRs
                touristName="Admin Dashboard"
              />

              {/* E-FIR Management Table would go here in production */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">All E-FIRs</h3>
                  <p className="text-sm text-gray-600">
                    Full E-FIR management interface would be implemented here with search, filtering, and bulk operations.
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
