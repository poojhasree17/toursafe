import { NextRequest, NextResponse } from 'next/server';
import { CreateIncidentSchema } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('incidents')
      .select(`
        *,
        tourists!inner(display_name),
        app_users(email)
      `)
      .order('ts', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: incidents, error } = await query;

    if (error) {
      console.error('Incidents fetch failed:', error);
      throw new Error('Failed to fetch incidents');
    }

    return NextResponse.json({
      incidents: incidents || [],
      pagination: {
        offset,
        limit,
        hasMore: incidents?.length === limit
      }
    });

  } catch (error) {
    console.error('Incidents GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tourist_id, type, lat, lng, severity = 'MEDIUM' } = CreateIncidentSchema.parse(body);

    const { data: incident, error } = await supabaseAdmin
      .from('incidents')
      .insert({
        tourist_id,
        type,
        severity,
        lat: lat || null,
        lng: lng || null,
        status: 'OPEN',
        meta: {
          manual_trigger: true,
          user_initiated: type === 'SOS'
        }
      })
      .select(`
        *,
        tourists(display_name)
      `)
      .single();

    if (error) {
      console.error('Incident creation failed:', error);
      throw new Error('Failed to create incident');
    }

    // Publish to realtime channel for dashboard
    await supabaseAdmin
      .channel('incidents')
      .send({
        type: 'broadcast',
        event: 'new_incident',
        payload: incident
      });

    // TODO: Send push notifications to operators
    // This would use FCM to notify dashboard users

    return NextResponse.json({
      incident,
      message: 'Incident created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Incident creation error:', error);
    
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
