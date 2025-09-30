import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface FamilyMember {
  email: string;
  name: string;
  relationship: 'parent' | 'spouse' | 'sibling' | 'child' | 'guardian' | 'other';
}

interface TrackingRequest {
  touristId: string;
  familyMembers: FamilyMember[];
  expiresAt?: string; // Optional expiration for temporary sharing
}

// Generate secure access token
function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST /api/v1/family - Setup family tracking for a tourist
export async function POST(request: NextRequest) {
  try {
    const body: TrackingRequest = await request.json();
    const { touristId, familyMembers, expiresAt } = body;

    if (!touristId || !familyMembers || familyMembers.length === 0) {
      return NextResponse.json(
        { error: 'Tourist ID and family members are required' },
        { status: 400 }
      );
    }

    // Verify tourist exists
    const { data: tourist, error: touristError } = await supabase
      .from('tourists')
      .select('id, display_name')
      .eq('id', touristId)
      .single();

    if (touristError || !tourist) {
      return NextResponse.json(
        { error: 'Tourist not found' },
        { status: 404 }
      );
    }

    const results = [];

    // Process each family member
    for (const member of familyMembers) {
      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('family_tracking')
        .select('id')
        .eq('tourist_id', touristId)
        .eq('family_member_email', member.email)
        .single();

      let trackingId: string;

      if (existing) {
        // Update existing relationship
        const { data: updated, error: updateError } = await supabase
          .from('family_tracking')
          .update({
            family_member_name: member.name,
            relationship: member.relationship,
            expires_at: expiresAt || null,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (updateError) {
          console.error('Error updating family tracking:', updateError);
          continue;
        }

        trackingId = updated.id;
      } else {
        // Create new relationship
        const { data: created, error: createError } = await supabase
          .from('family_tracking')
          .insert({
            tourist_id: touristId,
            family_member_email: member.email,
            family_member_name: member.name,
            relationship: member.relationship,
            expires_at: expiresAt || null,
            is_active: true
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating family tracking:', createError);
          continue;
        }

        trackingId = created.id;
      }

      // Generate access token
      const accessToken = generateAccessToken();
      const tokenHash = hashToken(accessToken);
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hour expiry

      // Store access token
      const { error: tokenError } = await supabase
        .from('family_access_tokens')
        .insert({
          family_tracking_id: trackingId,
          token_hash: tokenHash,
          expires_at: tokenExpiry.toISOString(),
          is_active: true
        });

      if (tokenError) {
        console.error('Error creating access token:', tokenError);
        continue;
      }

      results.push({
        email: member.email,
        name: member.name,
        relationship: member.relationship,
        accessToken,
        expiresAt: tokenExpiry.toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      tracking: results,
      touristName: tourist.display_name
    });

  } catch (error) {
    console.error('Family tracking setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/v1/family?touristId=xxx - Get family tracking relationships for a tourist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const touristId = searchParams.get('touristId');

    if (!touristId) {
      return NextResponse.json(
        { error: 'Tourist ID is required' },
        { status: 400 }
      );
    }

    // Get active family tracking relationships
    const { data: tracking, error } = await supabase
      .from('family_tracking')
      .select(`
        id,
        family_member_name,
        family_member_email,
        relationship,
        expires_at,
        is_active,
        created_at
      `)
      .eq('tourist_id', touristId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching family tracking:', error);
      return NextResponse.json(
        { error: 'Failed to fetch family tracking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tracking: tracking || []
    });

  } catch (error) {
    console.error('Family tracking fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/family - Remove family tracking relationship
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { touristId, familyMemberEmail } = body;

    if (!touristId || !familyMemberEmail) {
      return NextResponse.json(
        { error: 'Tourist ID and family member email are required' },
        { status: 400 }
      );
    }

    // Deactivate the relationship
    const { error } = await supabase
      .from('family_tracking')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('tourist_id', touristId)
      .eq('family_member_email', familyMemberEmail);

    if (error) {
      console.error('Error deactivating family tracking:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate family tracking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Family tracking deactivated'
    });

  } catch (error) {
    console.error('Family tracking deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
