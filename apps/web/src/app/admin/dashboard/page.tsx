'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@toursafe/ui';
import { 
  Shield, AlertTriangle, MapPin, Users, Activity, FileText, 
  Search, Filter, Download, RefreshCw, UserCheck, Clock, 
  TrendingUp, AlertCircle, CheckCircle, XCircle, Eye, Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import dynamic from 'next/dynamic';

// Dynamically import map component
const TourSafeMap = dynamic(
  () => import('../../../components/toursafe-map-leaflet').then(mod => ({ default: mod.TourSafeMap })),
  { ssr: false }
);

const HeatMapVisualizer = dynamic(
  () => import('../../../components/heat-map-visualizer').then(mod => ({ default: mod.HeatMapVisualizer })),
  { ssr: false }
);

interface Tourist {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  nationality: string;
  active: boolean;
  last_location?: {
    lat: number;
    lng: number;
    updated_at: string;
  };
  created_at: string;
  expires_at: string;
  emergency_contacts?: any;
  trip_itinerary?: any;
}

interface Incident {
  id: string;
  type: string;
  severity: string;
  tourist_id: string;
  tourist?: {
    display_name: string;
  };
  lat: number;
  lng: number;
  status: string;
  ts: string;
  meta?: any;
}

interface HeatMapPoint {
  lat: number;
  lng: number;
  intensity: number;
  type: string;
}

interface ClusterData {
  location: [number, number];
  count: number;
  tourists: Tourist[];
}

export default function PoliceDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedTourist, setSelectedTourist] = useState<Tourist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'tourists' | 'incidents' | 'heatmap'>('overview');
  const [autoEFIRModal, setAutoEFIRModal] = useState(false);
  const [selectedIncidentForEFIR, setSelectedIncidentForEFIR] = useState<Incident | null>(null);
  const [heatMapData, setHeatMapData] = useState<any>(null);
  const [clusterData, setClusterData] = useState<any>(null);
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Set up real-time updates
      const channel = supabase
        .channel('police_dashboard')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'incidents' },
          () => loadIncidents()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tourists' },
          () => loadTourists()
        )
        .subscribe();

      // Poll every 30 seconds for location updates
      const pollInterval = setInterval(() => {
        loadTourists();
      }, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [user]);

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
    setLoading(true);
    await Promise.all([
      loadTourists(), 
      loadIncidents(), 
      loadHeatMapData(),
      loadClusterData()
    ]);
    setLoading(false);
  };

  const loadHeatMapData = async () => {
    try {
      const response = await fetch('/api/v1/heatmap?type=incidents&timeRange=7d');
      if (response.ok) {
        const data = await response.json();
        setHeatMapData(data);
      }
    } catch (error) {
      console.error('Failed to load heat map data:', error);
    }
  };

  const loadClusterData = async () => {
    try {
      const response = await fetch('/api/v1/clusters');
      if (response.ok) {
        const data = await response.json();
        setClusterData(data);
      }
    } catch (error) {
      console.error('Failed to load cluster data:', error);
    }
  };

  const loadTourists = async () => {
    try {
      // Fetch tourists with their latest location
      const { data, error } = await supabase
        .from('tourists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with location data from iot_data table
      const touristsWithLocation = await Promise.all(
        (data || []).map(async (tourist) => {
          const { data: locationData } = await supabase
            .from('iot_data')
            .select('lat, lng, ts')
            .eq('tourist_id', tourist.id)
            .order('ts', { ascending: false })
            .limit(1)
            .single();

          return {
            ...tourist,
            last_location: locationData ? {
              lat: locationData.lat,
              lng: locationData.lng,
              updated_at: locationData.ts
            } : null
          };
        })
      );

      setTourists(touristsWithLocation);
    } catch (error) {
      console.error('Failed to load tourists:', error);
      toast.error('Failed to load tourist data');
    }
  };

  const loadIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          type,
          severity,
          tourist_id,
          lat,
          lng,
          status,
          ts,
          meta,
          tourists!inner(display_name)
        `)
        .order('ts', { ascending: false })
        .limit(100);

      if (error) throw error;

      setIncidents(data?.map((incident: any) => ({
        ...incident,
        tourist: incident.tourists
      })) || []);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      toast.error('Failed to load incidents');
    }
  };

  // Calculate tourist clusters
  const touristClusters: ClusterData[] = useMemo(() => {
    const clusters: { [key: string]: ClusterData } = {};
    const gridSize = 0.01; // ~1km grid

    tourists.filter(t => t.last_location).forEach(tourist => {
      const loc = tourist.last_location!;
      const gridKey = `${Math.floor(loc.lat / gridSize)}_${Math.floor(loc.lng / gridSize)}`;
      
      if (!clusters[gridKey]) {
        clusters[gridKey] = {
          location: [loc.lat, loc.lng],
          count: 0,
          tourists: []
        };
      }
      
      clusters[gridKey].count++;
      clusters[gridKey].tourists.push(tourist);
    });

    return Object.values(clusters);
  }, [tourists]);

  // Filter tourists based on search and status
  const filteredTourists = useMemo(() => {
    return tourists.filter(tourist => {
      const matchesSearch = searchTerm === '' || 
        tourist.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tourist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tourist.phone.includes(searchTerm) ||
        tourist.nationality.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && tourist.active) ||
        (filterStatus === 'inactive' && !tourist.active);

      return matchesSearch && matchesStatus;
    });
  }, [tourists, searchTerm, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      totalTourists: tourists.length,
      activeTourists: tourists.filter(t => t.active).length,
      totalIncidents: incidents.length,
      openIncidents: incidents.filter(i => i.status === 'OPEN').length,
      highSeverity: incidents.filter(i => i.severity === 'HIGH' && i.status !== 'CLOSED').length,
      recent24h: incidents.filter(i => new Date(i.ts) > last24h).length,
      missingPersons: incidents.filter(i => i.type === 'MISSING_PERSON' && i.status !== 'CLOSED').length
    };
  }, [tourists, incidents]);

  const handleGenerateAutoEFIR = async (incident: Incident) => {
    setSelectedIncidentForEFIR(incident);
    setAutoEFIRModal(true);
  };

  const createAutoEFIR = async () => {
    if (!selectedIncidentForEFIR) return;

    try {
      const tourist = tourists.find(t => t.id === selectedIncidentForEFIR.tourist_id);
      if (!tourist) {
        toast.error('Tourist not found');
        return;
      }

      const efirData = {
        touristId: tourist.id,
        incidentId: selectedIncidentForEFIR.id,
        incidentType: 'MISSING_PERSON',
        incidentDescription: `Automated E-FIR: ${selectedIncidentForEFIR.type} incident detected. Tourist: ${tourist.display_name}. Last known location: ${selectedIncidentForEFIR.lat}, ${selectedIncidentForEFIR.lng}`,
        incidentLocation: `Lat: ${selectedIncidentForEFIR.lat}, Lng: ${selectedIncidentForEFIR.lng}`,
        incidentDateTime: selectedIncidentForEFIR.ts,
        complainantName: user?.email || 'System Generated',
        complainantPhone: tourist.phone || tourist.emergency_contacts?.[0]?.phone,
        witnesses: []
      };

      const response = await fetch('/api/v1/efir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(efirData)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`E-FIR ${result.efir.firNumber} generated successfully`);
        setAutoEFIRModal(false);
        setSelectedIncidentForEFIR(null);
        loadIncidents();
      } else {
        toast.error(result.error || 'Failed to generate E-FIR');
      }
    } catch (error) {
      console.error('E-FIR generation error:', error);
      toast.error('Failed to generate E-FIR');
    }
  };

  const viewTouristDetails = (tourist: Tourist) => {
    setSelectedTourist(tourist);
  };

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      stats,
      tourists: filteredTourists,
      incidents,
      clusters: touristClusters
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `police-dashboard-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Police & Tourism Department Dashboard</h1>
                <p className="text-sm text-gray-500">Real-time monitoring & incident management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={loadDashboardData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Back to Admin
                </Button>
              </Link>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex space-x-2 pb-4 border-t pt-4">
            {[
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'tourists', label: 'Digital IDs', icon: Users },
              { key: 'incidents', label: 'Incidents & Alerts', icon: AlertTriangle },
              { key: 'heatmap', label: 'Risk Heat Map', icon: MapPin }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={viewMode === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(key as any)}
                className="flex items-center"
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Tourists</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeTourists}</p>
                <p className="text-xs text-gray-400">of {stats.totalTourists} total</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Open Incidents</p>
                <p className="text-2xl font-bold text-red-600">{stats.openIncidents}</p>
                <p className="text-xs text-gray-400">{stats.highSeverity} high severity</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Missing Persons</p>
                <p className="text-2xl font-bold text-orange-600">{stats.missingPersons}</p>
                <p className="text-xs text-gray-400">Requires attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">24h Activity</p>
                <p className="text-2xl font-bold text-green-600">{stats.recent24h}</p>
                <p className="text-xs text-gray-400">incidents logged</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Overview Mode */}
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map with Tourist Clusters */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Tourist Clusters & Locations</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {clusterData?.summary?.totalTourists || 0} tourists with location data in {clusterData?.summary?.totalClusters || 0} clusters
                  </p>
                  {stats.activeTourists > (clusterData?.summary?.totalTourists || 0) && (
                    <span className="text-xs text-amber-600 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {stats.activeTourists - (clusterData?.summary?.totalTourists || 0)} tourist(s) without GPS data
                    </span>
                  )}
                </div>
              </div>
              <div className="h-96">
                <TourSafeMap
                  center={[18.9220, 72.8347]}
                  zoom={12}
                  zones={[]}
                  userLocation={undefined}
                />
              </div>
              <div className="p-4 border-t bg-gray-50">
                {clusterData?.summary?.totalClusters > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{clusterData?.summary?.highDensityClusters || 0}</div>
                      <div className="text-gray-600">High Density</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-600">{clusterData?.summary?.mediumDensityClusters || 0}</div>
                      <div className="text-gray-600">Medium Density</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{clusterData?.summary?.lowDensityClusters || 0}</div>
                      <div className="text-gray-600">Low Density</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No location data available</p>
                    <p className="text-xs text-gray-400 mt-1">Tourists need to enable GPS tracking in their app</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Recent Incidents</h3>
                <p className="text-sm text-gray-500">Last 10 incidents</p>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {incidents.slice(0, 10).map((incident) => (
                  <div key={incident.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            incident.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                            incident.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {incident.severity}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{incident.type}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {incident.tourist?.display_name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(incident.ts).toLocaleString()}
                        </p>
                      </div>
                      {incident.type === 'MISSING_PERSON' && incident.status !== 'CLOSED' && !incident.meta?.efir_generated && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateAutoEFIR(incident)}
                          className="ml-2"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Auto E-FIR
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Digital IDs Mode */}
        {viewMode === 'tourists' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Digital Tourist IDs</h3>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tourists..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tourist
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nationality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTourists.map((tourist) => (
                    <tr key={tourist.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCheck className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{tourist.display_name}</div>
                            <div className="text-xs text-gray-500">{tourist.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{tourist.email}</div>
                        <div className="text-xs text-gray-500">{tourist.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{tourist.nationality}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tourist.last_location ? (
                          <div className="text-sm">
                            <div className="text-gray-900 flex items-center">
                              <Navigation className="h-3 w-3 mr-1 text-green-500" />
                              {tourist.last_location.lat.toFixed(4)}, {tourist.last_location.lng.toFixed(4)}
                            </div>
                            <div className="text-xs text-gray-500">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(tourist.last_location.updated_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No location data</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tourist.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tourist.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewTouristDetails(tourist)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Incidents Mode */}
        {viewMode === 'incidents' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Alert History & Incident Management</h3>
              <p className="text-sm text-gray-500">Complete incident log with automated E-FIR generation</p>
            </div>
            <div className="divide-y">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          incident.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                          incident.status === 'ACK' ? 'bg-yellow-100 text-yellow-800' :
                          incident.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {incident.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          incident.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          incident.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {incident.severity}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{incident.type}</span>
                        {incident.meta?.efir_generated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <FileText className="h-3 w-3 mr-1" />
                            E-FIR: {incident.meta.efir_number}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Tourist: <span className="font-medium text-gray-900">{incident.tourist?.display_name}</span></p>
                          <p className="text-gray-600">Location: <span className="font-mono text-xs">{incident.lat?.toFixed(4)}, {incident.lng?.toFixed(4)}</span></p>
                        </div>
                        <div>
                          <p className="text-gray-600">Time: <span className="font-medium text-gray-900">{new Date(incident.ts).toLocaleString()}</span></p>
                          <p className="text-gray-600">ID: <span className="font-mono text-xs">{incident.id.slice(0, 12)}...</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <Link href={`/admin/incidents/${incident.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </Link>
                      {incident.type === 'MISSING_PERSON' && incident.status !== 'CLOSED' && !incident.meta?.efir_generated && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateAutoEFIR(incident)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Generate E-FIR
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heat Map Mode */}
        {viewMode === 'heatmap' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">High-Risk Zone Heat Map</h3>
              <p className="text-sm text-gray-500">
                {heatMapData?.points?.length || 0} incident points analyzed across {heatMapData?.clusters?.length || 0} risk zones
              </p>
            </div>
            <div className="h-[600px]">
              {heatMapData && (
                <HeatMapVisualizer
                  center={[18.9220, 72.8347]}
                  zoom={11}
                  points={heatMapData.points || []}
                  clusters={heatMapData.clusters || []}
                  onClusterClick={(cluster) => {
                    console.log('Cluster clicked:', cluster);
                    toast.success(`${cluster.riskLevel} risk zone with ${cluster.count} incidents`);
                  }}
                />
              )}
            </div>
            <div className="p-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Risk Zone Summary</h4>
              {heatMapData?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-red-600 font-medium">Critical Risk</p>
                        <p className="text-2xl font-bold text-red-700">
                          {heatMapData.clusters?.filter((c: any) => c.riskLevel === 'CRITICAL').length || 0}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-600 font-medium">High Risk</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {heatMapData.summary.highRiskClusters || 0}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-orange-400" />
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-yellow-600 font-medium">Medium Risk</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {heatMapData.summary.mediumRiskClusters || 0}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-yellow-400" />
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium">Low Risk</p>
                        <p className="text-2xl font-bold text-green-700">
                          {heatMapData.summary.lowRiskClusters || 0}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-4 text-xs text-gray-500">
                Last updated: {heatMapData?.timestamp ? new Date(heatMapData.timestamp).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tourist Details Modal */}
      {selectedTourist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Tourist Details</h3>
                <button
                  onClick={() => setSelectedTourist(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{selectedTourist.display_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nationality</label>
                  <p className="text-gray-900">{selectedTourist.nationality}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{selectedTourist.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{selectedTourist.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedTourist.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTourist.active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tourist ID</label>
                  <p className="text-xs font-mono text-gray-700">{selectedTourist.id}</p>
                </div>
              </div>

              {selectedTourist.last_location && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Known Location</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">
                      <MapPin className="inline h-4 w-4 mr-1 text-green-500" />
                      Lat: {selectedTourist.last_location.lat.toFixed(6)}, 
                      Lng: {selectedTourist.last_location.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {new Date(selectedTourist.last_location.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {selectedTourist.emergency_contacts && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Emergency Contacts</label>
                  <div className="mt-2 space-y-2">
                    {selectedTourist.emergency_contacts.map((contact: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-gray-600">{contact.phone}</p>
                        <p className="text-xs text-gray-500">{contact.relation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTourist.trip_itinerary && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Trip Itinerary</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <p>Duration: {selectedTourist.trip_itinerary.duration}</p>
                    <p>Purpose: {selectedTourist.trip_itinerary.purpose}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50">
              <Button onClick={() => setSelectedTourist(null)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Auto E-FIR Modal */}
      {autoEFIRModal && selectedIncidentForEFIR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Generate Automated E-FIR</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                This will automatically generate an E-FIR for the missing person incident:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <p><span className="font-medium">Type:</span> {selectedIncidentForEFIR.type}</p>
                <p><span className="font-medium">Tourist:</span> {selectedIncidentForEFIR.tourist?.display_name}</p>
                <p><span className="font-medium">Severity:</span> {selectedIncidentForEFIR.severity}</p>
                <p><span className="font-medium">Time:</span> {new Date(selectedIncidentForEFIR.ts).toLocaleString()}</p>
                <p><span className="font-medium">Location:</span> {selectedIncidentForEFIR.lat}, {selectedIncidentForEFIR.lng}</p>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex space-x-3">
              <Button onClick={() => setAutoEFIRModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={createAutoEFIR} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Generate E-FIR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

