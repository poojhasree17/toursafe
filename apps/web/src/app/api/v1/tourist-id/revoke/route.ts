import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { z } from 'zod';

const RevokeTouristIDSchema = z.object({
  touristId: z.string().min(1, 'Tourist ID is required'),
  reason: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { touristId, reason } = RevokeTouristIDSchema.parse(body);

    // Update tourist status to inactive
    const { error } = await supabaseAdmin
      .from('tourists')
      .update({
        active: false,
        revoked_at: new Date().toISOString(),
        revocation_reason: reason
      })
      .eq('id', touristId);

    if (error) {
      console.error('Database update failed:', error);
      return NextResponse.json(
        { error: 'Failed to revoke tourist ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tourist ID revoked successfully',
      revokedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tourist ID revocation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      );
    }

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
