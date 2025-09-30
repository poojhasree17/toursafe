import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface LocationRequest {
  token: string;
  touristId: string;
}

// GET /api/v1/family/location?token=xxx&touristId=xxx - Get tourist location for family member
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const touristId = searchParams.get('touristId');

    if (!token || !touristId) {
      return NextResponse.json(
        { error: 'Access token and tourist ID are required' },
        { status: 400 }
      );
    }

    // Hash the provided token for comparison
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verify token exists and is valid
    const { data: accessToken, error: tokenError } = await supabase
      .from('family_access_tokens')
      .select(`
        id,
        family_tracking_id,
        expires_at,
        is_active,
        family_tracking (
          tourist_id,
          family_member_email,
          family_member_name,
          relationship,
          is_active
        )
      `)
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !accessToken) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    const tracking = accessToken.family_tracking as any;

    // Verify the token is for the requested tourist
    if (tracking.tourist_id !== touristId) {
      return NextResponse.json(
        { error: 'Access token not authorized for this tourist' },
        { status: 403 }
      );
    }

    // Update last used timestamp
    await supabase
      .from('family_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', accessToken.id);

    // Get recent location data (last 2 hours)
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data: recentPings, error: pingsError } = await supabase
      .from('pings')
      .select('lat, lng, ts, speed, bearing')
      .eq('tourist_id', touristId)
      .gte('ts', twoHoursAgo.toISOString())
      .order('ts', { ascending: false })
      .limit(50);

    if (pingsError) {
      console.error('Error fetching recent pings:', pingsError);
      return NextResponse.json(
        { error: 'Failed to fetch location data' },
        { status: 500 }
      );
    }

    // Get tourist info
    const { data: tourist, error: touristError } = await supabase
      .from('tourists')
      .select('display_name, emergency_contact')
      .eq('id', touristId)
      .single();

    if (touristError) {
      console.error('Error fetching tourist info:', touristError);
    }

    return NextResponse.json({
      tourist: tourist ? {
        name: tourist.display_name,
        emergencyContact: tourist.emergency_contact
      } : null,
      location: recentPings && recentPings.length > 0 ? {
        lat: recentPings[0].lat,
        lng: recentPings[0].lng,
        timestamp: recentPings[0].ts,
        speed: recentPings[0].speed,
        bearing: recentPings[0].bearing
      } : null,
      recentPings: recentPings || [],
      familyMember: {
        name: tracking.family_member_name,
        email: tracking.family_member_email,
        relationship: tracking.relationship
      },
      expiresAt: accessToken.expires_at
    });

  } catch (error) {
    console.error('Family location access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/family/location - Verify access token (for validation before showing location)
export async function POST(request: NextRequest) {
  try {
    const body: LocationRequest = await request.json();
    const { token, touristId } = body;

    if (!token || !touristId) {
      return NextResponse.json(
        { error: 'Access token and tourist ID are required' },
        { status: 400 }
      );
    }

    // Hash the provided token for comparison
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verify token exists and is valid
    const { data: accessToken, error: tokenError } = await supabase
      .from('family_access_tokens')
      .select(`
        id,
        family_tracking_id,
        expires_at,
        is_active,
        family_tracking (
          tourist_id,
          family_member_name,
          relationship,
          is_active
        )
      `)
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !accessToken) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    const tracking = accessToken.family_tracking as any;

    // Verify the token is for the requested tourist
    if (tracking.tourist_id !== touristId) {
      return NextResponse.json(
        { valid: false, error: 'Access token not authorized for this tourist' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      familyMember: {
        name: tracking.family_member_name,
        relationship: tracking.relationship
      },
      expiresAt: accessToken.expires_at
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
