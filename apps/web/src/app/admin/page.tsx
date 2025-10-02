'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@toursafe/ui';
import { Shield, AlertTriangle, Settings, Home, Wifi, WifiOff, MapPin, Users, Activity, CheckCircle, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentUser, signOut } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { onMessageListener } from '../../lib/firebase';
import { LanguageSwitcher } from '../../components/language-switcher';

interface Stats {
  activeTourists: number;
  openIncidents: number;
  resolvedToday: number;
  aiActive: boolean;
}

interface Incident {
  id: string;
  type: string;
  severity: string;
  tourist: {
    display_name: string;
  };
  lat: number;
  lng: number;
  status: string;
  ts: string;
  description: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    activeTourists: 0,
    openIncidents: 0,
    resolvedToday: 0,
    aiActive: true
  });
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication and load data on mount
  useEffect(() => {
    checkAuth();
    loadDashboardData();

    // Set up online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up real-time incident updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        (payload) => {
          console.log('Real-time incident update:', payload);
          loadDashboardData(); // Refresh dashboard data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Set up FCM message listener
  useEffect(() => {
    const unsubscribe = onMessageListener((payload) => {
      console.log('FCM message received:', payload);
      const { title, body } = payload.notification || {};
      toast(body || title || 'Notification', {
        duration: 5000,
      });
    });

    return unsubscribe;
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/admin/login');
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats
      const [touristsRes, incidentsRes, resolvedRes] = await Promise.all([
        supabase.from('tourists').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('incidents').select('id', { count: 'exact' }).in('status', ['OPEN', 'ACK']),
        supabase.from('incidents').select('id', { count: 'exact' })
          .eq('status', 'CLOSED')
          .gte('ts', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      setStats({
        activeTourists: touristsRes.count || 0,
        openIncidents: incidentsRes.count || 0,
        resolvedToday: resolvedRes.count || 0,
        aiActive: true
      });

      // Load recent incidents
      const { data: incidents } = await supabase
        .from('incidents')
        .select(`
          id,
          type,
          severity,
          lat,
          lng,
          status,
          ts,
          tourists(display_name),
          meta
        `)
        .order('ts', { ascending: false })
        .limit(5);

      if (incidents) {
        setRecentIncidents(incidents.map(incident => ({
          ...incident,
          tourist: incident.tourists as any,
          description: incident.meta?.description || `${incident.type} incident reported`
        })));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const [dashboardActionLoading, setDashboardActionLoading] = useState<string | null>(null);

  const handleDashboardAcknowledge = async (incidentId: string) => {
    try {
      setDashboardActionLoading(incidentId);

      // Update incident status to ACK in database
      const { error } = await supabase
        .from('incidents')
        .update({ status: 'ACK' })
        .eq('id', incidentId);

      if (error) throw error;

      toast.success('Incident acknowledged successfully');
      loadDashboardData(); // Refresh dashboard data
    } catch (error) {
      console.error('Failed to acknowledge incident:', error);
      toast.error('Failed to acknowledge incident');
    } finally {
      setDashboardActionLoading(null);
    }
  };

  const handleDashboardClose = async (incidentId: string) => {
    try {
      setDashboardActionLoading(incidentId);

      // Update incident status to CLOSED in database
      const { error } = await supabase
        .from('incidents')
        .update({ status: 'CLOSED' })
        .eq('id', incidentId);

      if (error) throw error;

      toast.success('Incident closed successfully');
      loadDashboardData(); // Refresh dashboard data
    } catch (error) {
      console.error('Failed to close incident:', error);
      toast.error('Failed to close incident');
    } finally {
      setDashboardActionLoading(null);
    }
  };

  const handleDashboardDetails = (incidentId: string) => {
    // Navigate to detailed incident view
    router.push(`/admin/incidents/${incidentId}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out failed:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in checkAuth
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">TourSafe Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="text-sm text-gray-500">
                {user?.email} ({user?.role})
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Welcome Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Welcome to TourSafe Command Center
            </h2>
            <p className="text-blue-700">
              Monitor tourist safety, manage incidents, and respond to emergencies in real-time.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Tourists</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.activeTourists}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5C3.41 18.167 4.372 20 5.912 20z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Open Incidents</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.openIncidents}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Resolved Today</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.resolvedToday}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">AI Detections</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.aiActive ? 'Active' : 'Offline'}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <svg className="h-8 w-8 text-red-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5C3.41 18.167 4.372 20 5.912 20z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Incident Management</h3>
                    <p className="text-sm text-gray-500">View and manage active incidents</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/admin/incidents" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                    View Incidents
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <svg className="h-8 w-8 text-blue-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Safety Zones</h3>
                    <p className="text-sm text-gray-500">Manage geofenced areas</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/admin/zones" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Manage Zones
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <svg className="h-8 w-8 text-green-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">VC Verification</h3>
                    <p className="text-sm text-gray-500">Verify blockchain credentials</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/admin/audit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                    Audit Trail
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Incidents</h3>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </Button>
                  <Link href="/admin/incidents">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                {recentIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
                    <p className="text-gray-500">No recent incidents. All tourists are safe!</p>
                  </div>
                ) : (
                  recentIncidents.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-3 w-3 rounded-full ${
                          incident.status === 'OPEN' ? 'bg-red-400' :
                          incident.status === 'ACK' ? 'bg-yellow-400' :
                          incident.status === 'CLOSED' ? 'bg-green-400' : 'bg-green-400'
                        }`}></div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {incident.type} - {incident.tourist?.display_name || 'Unknown'}
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
                            {new Date(incident.ts).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {incident.status === 'OPEN' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDashboardAcknowledge(incident.id)}
                              disabled={dashboardActionLoading === incident.id}
                            >
                              {dashboardActionLoading === incident.id ? '...' : 'Acknowledge'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDashboardAssign(incident.id)}
                              disabled={dashboardActionLoading === incident.id}
                            >
                              {dashboardActionLoading === incident.id ? '...' : 'Assign'}
                            </Button>
                          </>
                        )}
                        {incident.status === 'ACK' && (
                          <Button
                            size="sm"
                            onClick={() => handleDashboardClose(incident.id)}
                            disabled={dashboardActionLoading === incident.id}
                          >
                            {dashboardActionLoading === incident.id ? '...' : 'Close'}
                          </Button>
                        )}
                        {incident.status === 'CLOSED' && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                            {incident.status}
                          </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDashboardDetails(incident.id)}>
                          Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Service Status */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">AI Anomaly Detection</span>
                  </div>
                  <span className="text-sm text-green-600">Online</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">Database Connection</span>
                  </div>
                  <span className="text-sm text-green-600">Connected</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">Blockchain Network</span>
                  </div>
                  <span className="text-sm text-green-600">Amoy Testnet</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">Push Notifications</span>
                  </div>
                  <span className="text-sm text-green-600">Ready</span>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-lg ${
                  isOnline ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center">
                    <div className={`h-3 w-3 rounded-full mr-3 ${
                      isOnline ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900">Connection Status</span>
                  </div>
                  <span className={`text-sm ${
                    isOnline ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              TourSafe MVP - SIH 2025 PS-25002
            </p>
            <div className="flex space-x-4 text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-900">Home</Link>
              <Link href="/tourist" className="hover:text-gray-900">Tourist Portal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
