import { NextRequest, NextResponse } from 'next/server';
import { CreateZoneSchema } from '@toursafe/lib';
import { supabaseAdmin, mockData } from '../../../../lib/supabase';

export async function GET() {
  try {
    // Try to fetch from database first
    const { data: zones, error } = await supabaseAdmin
      .from('zones')
      .select(`
        *,
        app_users(email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Database fetch failed, using mock data:', error.message);
      // Fall back to mock data if database fails
      return NextResponse.json({
        zones: mockData.zones || []
      });
    }

    return NextResponse.json({
      zones: zones || []
    });

  } catch (error) {
    console.error('Zones GET error:', error);
    // Return mock data as final fallback
    return NextResponse.json({
      zones: mockData.zones || []
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, polygon_geojson } = CreateZoneSchema.parse(body);

    // TODO: Get created_by from authenticated user session
    // For now, using the admin user ID from seed data
    const created_by = '11111111-1111-1111-1111-111111111111';

    try {
      const { data: zone, error } = await supabaseAdmin
        .from('zones')
        .insert({
          name,
          type,
          polygon_geojson,
          created_by
        })
        .select(`
          *,
          app_users(email)
        `)
        .single();

      if (error) {
        console.error('Zone creation failed:', error);
        throw new Error('Failed to create zone');
      }

      return NextResponse.json({
        zone,
        message: 'Zone created successfully'
      }, { status: 201 });

    } catch (dbError) {
      console.warn('Database insert failed, returning mock response:', dbError);

      // Return a mock zone for demo purposes
      const mockZone = {
        id: `mock-${Date.now()}`,
        name,
        type,
        polygon_geojson,
        created_by,
        created_at: new Date().toISOString(),
        app_users: { email: 'admin@toursafe.demo' }
      };

      return NextResponse.json({
        zone: mockZone,
        message: 'Zone created successfully (demo mode)'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Zone creation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
