import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Find all tourists that have expired
    const now = new Date().toISOString();

    const { data: expiredTourists, error } = await supabaseAdmin
      .from('tourists')
      .select('id, display_name, expires_at')
      .eq('active', true)
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (error) {
      console.error('Database query failed:', error);
      return NextResponse.json(
        { error: 'Failed to check for expired tourist IDs' },
        { status: 500 }
      );
    }

    if (!expiredTourists || expiredTourists.length === 0) {
      return NextResponse.json({
        message: 'No expired tourist IDs found',
        expiredCount: 0
      });
    }

    // Mark expired tourists as inactive
    const expiredIds = expiredTourists.map(t => t.id);
    const { error: updateError } = await supabaseAdmin
      .from('tourists')
      .update({
        active: false,
        expired_at: new Date().toISOString(),
        expiration_reason: 'Trip duration completed'
      })
      .in('id', expiredIds);

    if (updateError) {
      console.error('Failed to update expired tourists:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark expired tourist IDs as inactive' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `${expiredTourists.length} tourist IDs marked as expired`,
      expiredCount: expiredTourists.length,
      expiredTourists: expiredTourists.map(t => ({
        id: t.id,
        displayName: t.display_name,
        expiredAt: t.expires_at
      }))
    });

  } catch (error) {
    console.error('Tourist ID expiration check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
