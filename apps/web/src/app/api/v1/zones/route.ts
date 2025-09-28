import { NextRequest, NextResponse } from 'next/server';
import { CreateZoneSchema } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET() {
  try {
    const { data: zones, error } = await supabaseAdmin
      .from('zones')
      .select(`
        *,
        app_users(email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Zones fetch failed:', error);
      throw new Error('Failed to fetch zones');
    }

    return NextResponse.json({
      zones: zones || []
    });

  } catch (error) {
    console.error('Zones GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, polygon_geojson } = CreateZoneSchema.parse(body);

    // TODO: Get created_by from authenticated user session
    // For now, using the admin user ID from seed data
    const created_by = '11111111-1111-1111-1111-111111111111';

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
