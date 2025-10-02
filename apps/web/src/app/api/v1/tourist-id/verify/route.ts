import { NextRequest, NextResponse } from 'next/server';
import { VCService } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { z } from 'zod';

const VerifyTouristIDSchema = z.object({
  vcJwt: z.string().min(1, 'VC JWT is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vcJwt } = VerifyTouristIDSchema.parse(body);

    // Verify the VC using our VC service
    const vcService = new VCService();
    const verification = await vcService.verifyVC(vcJwt);

    if (!verification.isValid) {
      return NextResponse.json({
        isValid: false,
        error: verification.error
      });
    }

    // Check if VC is expired
    const isExpired = vcService.isVCExpired(vcJwt);
    const daysUntilExpiry = vcService.getDaysUntilExpiry(vcJwt);

    // Get additional tourist info from database if available
    let touristInfo = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('tourists')
        .select('*')
        .eq('vc_jwt', vcJwt)
        .single();

      if (!error && data) {
        touristInfo = {
          displayName: data.display_name,
          email: data.email,
          phone: data.phone,
          nationality: data.nationality,
          active: data.active,
          issuedAt: data.created_at,
          expiresAt: data.expires_at
        };
      }
    } catch (dbError) {
      console.log('Database lookup failed (demo mode):', dbError);
    }

    return NextResponse.json({
      isValid: true,
      credential: verification.credential,
      isExpired,
      daysUntilExpiry,
      touristInfo
    });

  } catch (error) {
    console.error('Tourist ID verification error:', error);

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
