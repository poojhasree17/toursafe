import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const nationality = searchParams.get('nationality');
    const entryPoint = searchParams.get('entryPoint');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('tourists')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    if (nationality) {
      query = query.ilike('nationality', `%${nationality}%`);
    }

    if (entryPoint) {
      query = query.ilike('entry_point->name', `%${entryPoint}%`);
    }

    const { data: tourists, error, count } = await query;

    if (error) {
      console.error('Database query failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tourist IDs' },
        { status: 500 }
      );
    }

    // Filter out expired tourists unless specifically requested
    const now = new Date();
    let filteredTourists = tourists || [];

    if (active === null || active === 'true') {
      filteredTourists = filteredTourists.filter(tourist => {
        if (!tourist.expires_at) return true;
        return new Date(tourist.expires_at) > now;
      });
    }

    // Remove sensitive information and format response
    const sanitizedTourists = filteredTourists.map(tourist => ({
      id: tourist.id,
      displayName: tourist.display_name,
      email: tourist.email,
      phone: tourist.phone,
      nationality: tourist.nationality,
      active: tourist.active,
      issuedAt: tourist.created_at,
      expiresAt: tourist.expires_at,
      entryPoint: tourist.entry_point,
      kycInfo: tourist.kyc_info,
      tripItinerary: tourist.trip_itinerary,
      emergencyContacts: tourist.emergency_contacts,
      // Don't expose the full VC JWT for security
      hasValidVC: !!tourist.vc_jwt && tourist.vc_sha256
    }));

    return NextResponse.json({
      tourists: sanitizedTourists,
      total: count || filteredTourists.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Tourist ID list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
