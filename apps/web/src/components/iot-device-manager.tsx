'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@toursafe/ui';
import { Button } from '@toursafe/ui';
import { Input } from '@toursafe/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@toursafe/ui';
import {
  Smartphone, Plus, Trash2, Activity, Battery, Wifi, WifiOff,
  Heart, Thermometer, MapPin, AlertTriangle, CheckCircle,
  Settings, Bluetooth, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IoTDevice {
  id: string;
  device_id: string;
  device_type: string;
  device_name: string;
  manufacturer?: string;
  model?: string;
  firmware_version?: string;
  battery_level?: number;
  status: string;
  is_active: boolean;
  last_seen?: string;
  registered_at: string;
}

interface IoTDeviceManagerProps {
  touristId: string;
  touristName: string;
}

export function IoTDeviceManager({ touristId, touristName }: IoTDeviceManagerProps) {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceId: '',
    deviceType: 'SMART_BAND' as 'SMART_BAND' | 'GPS_TAG' | 'HEALTH_MONITOR' | 'EMERGENCY_BUTTON',
    deviceName: '',
    manufacturer: '',
    model: '',
    firmwareVersion: ''
  });

  useEffect(() => {
    loadDevices();
  }, [touristId]);

  const loadDevices = async () => {
    try {
      const response = await fetch(`/api/v1/iot/devices?touristId=${touristId}`);
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error loading IoT devices:', error);
    }
  };

  const registerDevice = async () => {
    if (!newDevice.deviceId || !newDevice.deviceName) {
      toast.error('Please fill in device ID and name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/iot/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId,
          deviceId: newDevice.deviceId,
          deviceType: newDevice.deviceType,
          deviceName: newDevice.deviceName,
          manufacturer: newDevice.manufacturer || undefined,
          model: newDevice.model || undefined,
          firmwareVersion: newDevice.firmwareVersion || undefined
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('IoT device registered successfully!');
        setShowAddForm(false);
        setNewDevice({
          deviceId: '',
          deviceType: 'SMART_BAND',
          deviceName: '',
          manufacturer: '',
          model: '',
          firmwareVersion: ''
        });
        loadDevices();
      } else {
        toast.error(result.error || 'Failed to register device');
      }
    } catch (error) {
      console.error('Device registration error:', error);
      toast.error('Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  const updateDeviceStatus = async (deviceId: string, status: string) => {
    try {
      const response = await fetch('/api/v1/iot/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          status
        })
      });

      if (response.ok) {
        toast.success('Device status updated');
        loadDevices();
      } else {
        toast.error('Failed to update device status');
      }
    } catch (error) {
      console.error('Device update error:', error);
      toast.error('Failed to update device');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'SMART_BAND':
        return <Smartphone className="h-5 w-5" />;
      case 'GPS_TAG':
        return <MapPin className="h-5 w-5" />;
      case 'HEALTH_MONITOR':
        return <Heart className="h-5 w-5" />;
      case 'EMERGENCY_BUTTON':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'INACTIVE':
        return 'text-gray-600 bg-gray-100';
      case 'MAINTENANCE':
        return 'text-yellow-600 bg-yellow-100';
      case 'DECOMMISSIONED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            IoT Device Management
          </CardTitle>
          <CardDescription>
            Manage your smart bands, GPS tags, and health monitoring devices for enhanced safety
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device List */}
          <div className="space-y-3">
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Registered</h3>
                <p className="text-gray-600 mb-4">
                  Register your IoT devices to enable continuous health and location monitoring
                </p>
                <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Device
                </Button>
              </div>
            ) : (
              <>
                {devices.map((device) => (
                  <div key={device.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getDeviceIcon(device.device_type)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{device.device_name}</div>
                          <div className="text-xs text-gray-600">{device.device_id}</div>
                          <div className="text-xs text-gray-500 capitalize">{device.device_type.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      {device.battery_level !== undefined && (
                        <div className="flex items-center space-x-2">
                          <Battery className="h-4 w-4 text-gray-500" />
                          <span className={device.battery_level < 20 ? 'text-red-600' : 'text-gray-700'}>
                            {device.battery_level}%
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        {device.last_seen ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-gray-700">
                          {formatLastSeen(device.last_seen)}
                        </span>
                      </div>

                      {device.manufacturer && (
                        <div className="text-gray-600">
                          {device.manufacturer}
                        </div>
                      )}

                      {device.model && (
                        <div className="text-gray-600">
                          {device.model}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {device.status === 'REGISTERED' && (
                        <Button
                          size="sm"
                          onClick={() => updateDeviceStatus(device.device_id, 'ACTIVE')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                      )}

                      {device.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateDeviceStatus(device.device_id, 'INACTIVE')}
                        >
                          Deactivate
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateDeviceStatus(device.device_id, 'MAINTENANCE')}
                      >
                        Maintenance
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Add Device Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">
                {showAddForm ? 'Register New Device' : 'Register New Device'}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Device'}
              </Button>
            </div>

            {showAddForm && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900 mb-1">Continuous Monitoring</p>
                      <p className="text-blue-800">
                        IoT devices provide real-time health data, location tracking, and emergency alerts for enhanced safety
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device ID *
                    </label>
                    <Input
                      placeholder="Enter device ID (MAC address, serial number)"
                      value={newDevice.deviceId}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, deviceId: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device Name *
                    </label>
                    <Input
                      placeholder="Enter device name"
                      value={newDevice.deviceName}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, deviceName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device Type
                    </label>
                    <Select
                      value={newDevice.deviceType}
                      onValueChange={(value: any) => setNewDevice(prev => ({ ...prev, deviceType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMART_BAND">Smart Band</SelectItem>
                        <SelectItem value="GPS_TAG">GPS Tag</SelectItem>
                        <SelectItem value="HEALTH_MONITOR">Health Monitor</SelectItem>
                        <SelectItem value="EMERGENCY_BUTTON">Emergency Button</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer
                    </label>
                    <Input
                      placeholder="Device manufacturer"
                      value={newDevice.manufacturer}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, manufacturer: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <Input
                      placeholder="Device model"
                      value={newDevice.model}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Firmware Version
                    </label>
                    <Input
                      placeholder="Firmware version"
                      value={newDevice.firmwareVersion}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, firmwareVersion: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={registerDevice}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <Bluetooth className="h-4 w-4 mr-2" />
                        Register Device
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Information */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Activity className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 mb-1">How IoT Devices Work</p>
                <ul className="text-amber-800 space-y-1 text-xs">
                  <li>• Devices automatically send location, health, and status data</li>
                  <li>• Emergency alerts are triggered based on abnormal readings</li>
                  <li>• Data is encrypted and only shared with authorized personnel</li>
                  <li>• Battery levels and connectivity status are monitored</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
