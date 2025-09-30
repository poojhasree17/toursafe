import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface DeviceRegistrationRequest {
  touristId: string;
  deviceId: string;
  deviceType: 'SMART_BAND' | 'GPS_TAG' | 'HEALTH_MONITOR' | 'EMERGENCY_BUTTON';
  deviceName: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
}

// POST /api/v1/iot/devices - Register new IoT device
export async function POST(request: NextRequest) {
  try {
    const body: DeviceRegistrationRequest = await request.json();
    const {
      touristId,
      deviceId,
      deviceType,
      deviceName,
      manufacturer,
      model,
      firmwareVersion
    } = body;

    if (!touristId || !deviceId || !deviceType || !deviceName) {
      return NextResponse.json(
        { error: 'Tourist ID, device ID, device type, and device name are required' },
        { status: 400 }
      );
    }

    // Verify tourist exists
    const { data: tourist, error: touristError } = await supabase
      .from('tourists')
      .select('id, display_name')
      .eq('id', touristId)
      .single();

    if (touristError || !tourist) {
      return NextResponse.json(
        { error: 'Tourist not found' },
        { status: 404 }
      );
    }

    // Check if device already exists
    const { data: existingDevice } = await supabase
      .from('iot_devices')
      .select('id, status')
      .eq('device_id', deviceId)
      .single();

    if (existingDevice) {
      // Update existing device if it's inactive/decommissioned
      if (existingDevice.status === 'DECOMMISSIONED' || existingDevice.status === 'INACTIVE') {
        const { data: updatedDevice, error: updateError } = await supabase
          .from('iot_devices')
          .update({
            tourist_id: touristId,
            device_type: deviceType,
            device_name: deviceName,
            manufacturer: manufacturer || null,
            model: model || null,
            firmware_version: firmwareVersion || null,
            status: 'REGISTERED',
            is_active: true,
            registered_at: new Date().toISOString()
          })
          .eq('id', existingDevice.id)
          .select('*')
          .single();

        if (updateError) {
          console.error('Error updating IoT device:', updateError);
          return NextResponse.json(
            { error: 'Failed to update device' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          device: updatedDevice,
          message: 'Device reactivated successfully'
        });
      } else {
        return NextResponse.json(
          { error: 'Device already registered and active' },
          { status: 409 }
        );
      }
    }

    // Register new device
    const { data: device, error: deviceError } = await supabase
      .from('iot_devices')
      .insert({
        tourist_id: touristId,
        device_id: deviceId,
        device_type: deviceType,
        device_name: deviceName,
        manufacturer: manufacturer || null,
        model: model || null,
        firmware_version: firmwareVersion || null,
        status: 'REGISTERED',
        is_active: true,
        battery_level: 100 // Assume full battery for new devices
      })
      .select('*')
      .single();

    if (deviceError) {
      console.error('Error registering IoT device:', deviceError);
      return NextResponse.json(
        { error: 'Failed to register device' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      device,
      message: 'Device registered successfully'
    });

  } catch (error) {
    console.error('IoT device registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/v1/iot/devices?touristId=xxx - Get IoT devices for a tourist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const touristId = searchParams.get('touristId');

    if (!touristId) {
      return NextResponse.json(
        { error: 'Tourist ID is required' },
        { status: 400 }
      );
    }

    const { data: devices, error } = await supabase
      .from('iot_devices')
      .select('*')
      .eq('tourist_id', touristId)
      .order('registered_at', { ascending: false });

    if (error) {
      console.error('Error fetching IoT devices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      devices: devices || []
    });

  } catch (error) {
    console.error('IoT devices fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/iot/devices - Update device status or settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, status, settings, batteryLevel } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (status) updateData.status = status;
    if (batteryLevel !== undefined) updateData.battery_level = batteryLevel;
    if (settings) updateData.settings = settings;

    // Update last seen when device reports in
    updateData.last_seen = new Date().toISOString();

    const { data: device, error } = await supabase
      .from('iot_devices')
      .update(updateData)
      .eq('device_id', deviceId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating IoT device:', error);
      return NextResponse.json(
        { error: 'Failed to update device' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      device
    });

  } catch (error) {
    console.error('IoT device update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
