import { NextRequest, NextResponse } from 'next/server';
import { VCService, ChainService } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { z } from 'zod';

const RenewTouristIDSchema = z.object({
  touristId: z.string().min(1, 'Tourist ID is required'),
  newDepartureDate: z.string().min(1, 'New departure date is required'),
  reason: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { touristId, newDepartureDate, reason } = RenewTouristIDSchema.parse(body);

    // Validate the new departure date is in the future
    const newExpiryDate = new Date(newDepartureDate);
    const now = new Date();

    if (newExpiryDate <= now) {
      return NextResponse.json(
        { error: 'New departure date must be in the future' },
        { status: 400 }
      );
    }

    // Get the existing tourist record
    const { data: tourist, error: fetchError } = await supabaseAdmin
      .from('tourists')
      .select('*')
      .eq('id', touristId)
      .single();

    if (fetchError || !tourist) {
      return NextResponse.json(
        { error: 'Tourist not found' },
        { status: 404 }
      );
    }

    if (!tourist.active) {
      return NextResponse.json(
        { error: 'Cannot renew inactive tourist ID' },
        { status: 400 }
      );
    }

    // Create a new VC with the extended validity
    const vcService = new VCService();
    const newVC = await vcService.issueVC({
      displayName: tourist.display_name,
      email: tourist.email,
      phone: tourist.phone,
      nationality: tourist.nationality,
      kycInfo: tourist.kyc_info,
      tripItinerary: {
        ...tourist.trip_itinerary,
        departureDate: newDepartureDate
      },
      emergencyContacts: tourist.emergency_contacts,
      entryPoint: tourist.entry_point
    });

    // Anchor the new VC on blockchain if configured
    let chainTxHash = null;
    if (process.env.AMOY_RPC_URL && process.env.CHAIN_PRIVATE_KEY) {
      try {
        const chainService = new ChainService({
          rpcUrl: process.env.AMOY_RPC_URL,
          privateKey: process.env.CHAIN_PRIVATE_KEY
        });

        const anchor = await chainService.anchorVC(newVC.vcJwt);
        chainTxHash = anchor.txHash;

        console.log('Renewed Tourist ID anchored on chain:', chainTxHash);
      } catch (chainError) {
        console.error('Chain anchoring failed for renewal:', chainError);
        // Continue without chain anchoring in development
      }
    }

    // Update the tourist record with new VC and expiry date
    const { error: updateError } = await supabaseAdmin
      .from('tourists')
      .update({
        vc_jwt: newVC.vcJwt,
        vc_sha256: newVC.vcSha256,
        chain_tx_hash: chainTxHash,
        expires_at: newDepartureDate,
        renewed_at: new Date().toISOString(),
        renewal_reason: reason,
        // Keep track of renewal count
        renewal_count: (tourist.renewal_count || 0) + 1
      })
      .eq('id', touristId);

    if (updateError) {
      console.error('Database update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tourist ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tourist ID renewed successfully',
      newVC: {
        vcJwt: newVC.vcJwt,
        vcSha256: newVC.vcSha256,
        chainTxHash
      },
      newExpiryDate: newDepartureDate,
      renewalCount: (tourist.renewal_count || 0) + 1
    });

  } catch (error) {
    console.error('Tourist ID renewal error:', error);

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
