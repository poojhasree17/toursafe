import { NextRequest, NextResponse } from 'next/server';
import { UpdateIncidentSchema } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: incident, error } = await supabaseAdmin
      .from('incidents')
      .select(`
        *,
        tourists(display_name, emergency_contact),
        app_users(email)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Incident fetch failed:', error);
      throw new Error('Failed to fetch incident');
    }

    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ incident });

  } catch (error) {
    console.error('Incident GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates = UpdateIncidentSchema.parse(body);

    const { data: incident, error } = await supabaseAdmin
      .from('incidents')
      .update(updates)
      .eq('id', params.id)
      .select(`
        *,
        tourists(display_name),
        app_users(email)
      `)
      .single();

    if (error) {
      console.error('Incident update failed:', error);
      throw new Error('Failed to update incident');
    }

    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    // Publish update to realtime channel
    await supabaseAdmin
      .channel('incidents')
      .send({
        type: 'broadcast',
        event: 'incident_updated',
        payload: incident
      });

    return NextResponse.json({
      incident,
      message: 'Incident updated successfully'
    });

  } catch (error) {
    console.error('Incident update error:', error);
    
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
