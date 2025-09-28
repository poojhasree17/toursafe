import { NextRequest, NextResponse } from 'next/server';
import { CreateZoneSchema } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: zone, error } = await supabaseAdmin
      .from('zones')
      .select(`
        *,
        app_users(email)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Zone fetch failed:', error);
      throw new Error('Failed to fetch zone');
    }

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ zone });

  } catch (error) {
    console.error('Zone GET error:', error);
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
    const updates = CreateZoneSchema.partial().parse(body);

    const { data: zone, error } = await supabaseAdmin
      .from('zones')
      .update(updates)
      .eq('id', params.id)
      .select(`
        *,
        app_users(email)
      `)
      .single();

    if (error) {
      console.error('Zone update failed:', error);
      throw new Error('Failed to update zone');
    }

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      zone,
      message: 'Zone updated successfully'
    });

  } catch (error) {
    console.error('Zone update error:', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('zones')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Zone deletion failed:', error);
      throw new Error('Failed to delete zone');
    }

    return NextResponse.json({
      message: 'Zone deleted successfully'
    });

  } catch (error) {
    console.error('Zone DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
