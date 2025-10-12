import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

interface IoTDataPoint {
  deviceId: string;
  dataType: 'LOCATION' | 'HEART_RATE' | 'TEMPERATURE' | 'FALL_DETECTED' | 'EMERGENCY_BUTTON' | 'BATTERY_LEVEL' | 'STEP_COUNT';
  value: number;
  unit?: string;
  locationLat?: number;
  locationLng?: number;
  metadata?: Record<string, any>;
}

// POST /api/v1/iot/data - Ingest IoT device data
export async function POST(request: NextRequest) {
  try {
    const body: IoTDataPoint = await request.json();
    const {
      deviceId,
      dataType,
      value,
      unit,
      locationLat,
      locationLng,
      metadata = {}
    } = body;

    if (!deviceId || !dataType || value === undefined) {
      return NextResponse.json(
        { error: 'Device ID, data type, and value are required' },
        { status: 400 }
      );
    }

    // Verify device exists and is active
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('iot_devices')
      .select('id, tourist_id, status, is_active')
      .eq('device_id', deviceId)
      .eq('status', 'ACTIVE')
      .eq('is_active', true)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found or inactive' },
        { status: 404 }
      );
    }

    // Insert data point
    const { data: dataPoint, error: dataError } = await supabaseAdmin
      .from('iot_data_points')
      .insert({
        device_id: device.id,
        data_type: dataType,
        value: value,
        unit: unit || null,
        location_lat: locationLat || null,
        location_lng: locationLng || null,
        metadata: metadata,
        recorded_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (dataError) {
      console.error('Error inserting IoT data:', dataError);
      return NextResponse.json(
        { error: 'Failed to store data' },
        { status: 500 }
      );
    }

    // Check for alert conditions and generate alerts if needed
    const alertGenerated = await checkAndGenerateAlerts(device.id, dataPoint);

    // Update device last seen and battery level if provided
    const updateData: any = {
      last_seen: new Date().toISOString()
    };

    if (dataType === 'BATTERY_LEVEL') {
      updateData.battery_level = value;
    }

    await supabaseAdmin
      .from('iot_devices')
      .update(updateData)
      .eq('id', device.id);

    // If this is location data, also create a ping record for consistency
    if (dataType === 'LOCATION' && locationLat && locationLng) {
      await supabaseAdmin
        .from('pings')
        .insert({
          tourist_id: device.tourist_id,
          lat: locationLat,
          lng: locationLng,
          ts: new Date().toISOString(),
          speed: metadata.speed || null,
          bearing: metadata.bearing || null
        });
    }

    return NextResponse.json({
      success: true,
      dataPoint: {
        id: dataPoint.id,
        recordedAt: dataPoint.recorded_at,
        alertGenerated
      }
    });

  } catch (error) {
    console.error('IoT data ingestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check data point for alert conditions and generate alerts
async function checkAndGenerateAlerts(deviceId: string, dataPoint: any): Promise<boolean> {
  const { data_type, value, location_lat, location_lng } = dataPoint;
  let alertType: string | null = null;
  let severity: string = 'MEDIUM';
  let message: string = '';

  // Check different alert conditions based on data type
  switch (data_type) {
    case 'HEART_RATE':
      if (value > 150) {
        alertType = 'HIGH_HEART_RATE';
        severity = 'HIGH';
        message = `Elevated heart rate detected: ${value} bpm`;
      } else if (value < 50) {
        alertType = 'LOW_HEART_RATE';
        severity = 'HIGH';
        message = `Low heart rate detected: ${value} bpm`;
      }
      break;

    case 'FALL_DETECTED':
      alertType = 'FALL_DETECTED';
      severity = 'CRITICAL';
      message = 'Fall detected! Tourist may need immediate assistance';
      break;

    case 'EMERGENCY_BUTTON':
      if (value > 0) {
        alertType = 'EMERGENCY_SIGNAL';
        severity = 'CRITICAL';
        message = 'Emergency button activated! Immediate response required';
      }
      break;

    case 'BATTERY_LEVEL':
      if (value < 20) {
        alertType = 'LOW_BATTERY';
        severity = value < 10 ? 'HIGH' : 'MEDIUM';
        message = `Low battery warning: ${value}% remaining`;
      }
      break;

    case 'LOCATION':
      // Check if tourist is in a restricted zone (simplified check)
      if (location_lat && location_lng) {
        // This would integrate with the zones system
        // For now, just check if coordinates are valid
        if (location_lat < -90 || location_lat > 90 || location_lng < -180 || location_lng > 180) {
          alertType = 'LOCATION_DEVIATION';
          severity = 'HIGH';
          message = 'Invalid location data received';
        }
      }
      break;

    case 'TEMPERATURE':
      if (value > 38) {
        alertType = 'HIGH_TEMPERATURE';
        severity = value > 40 ? 'CRITICAL' : 'HIGH';
        message = `Elevated body temperature: ${value}°C`;
      }
      break;
  }

  if (alertType) {
    const { error: alertError } = await supabaseAdmin
      .from('iot_alerts')
      .insert({
        device_id: deviceId,
        data_point_id: dataPoint.id,
        alert_type: alertType,
        severity,
        message
      });

    if (alertError) {
      console.error('Error creating IoT alert:', alertError);
    } else {
      // Update data point to indicate alert was generated
      await supabaseAdmin
        .from('iot_data_points')
        .update({ alert_generated: true })
        .eq('id', dataPoint.id);

      return true;
    }
  }

  return false;
}

// GET /api/v1/iot/data?deviceId=xxx&limit=50 - Get recent IoT data for a device
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // First get device info to verify access
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('iot_devices')
      .select('id, tourist_id, device_name')
      .eq('device_id', deviceId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    const { data: dataPoints, error } = await supabaseAdmin
      .from('iot_data_points')
      .select('*')
      .eq('device_id', device.id)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching IoT data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      device: {
        id: device.device_id,
        name: device.device_name,
        touristId: device.tourist_id
      },
      dataPoints: dataPoints || []
    });

  } catch (error) {
    console.error('IoT data fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
