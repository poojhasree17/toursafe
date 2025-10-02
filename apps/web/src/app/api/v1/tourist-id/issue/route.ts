import { NextRequest, NextResponse } from 'next/server';
import { VCService, ChainService } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { z } from 'zod';

// Enhanced schema for tourist ID issuance
const TouristIDSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  nationality: z.string().min(1, 'Nationality is required'),
  kycInfo: z.object({
    type: z.enum(['aadhaar', 'passport', 'other']),
    number: z.string().optional(),
    country: z.string().optional(),
    expiryDate: z.string().optional()
  }).optional(),
  tripItinerary: z.object({
    arrivalDate: z.string().min(1, 'Arrival date is required'),
    departureDate: z.string().min(1, 'Departure date is required'),
    destinations: z.array(z.string()),
    purpose: z.string().optional()
  }),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1, 'Contact name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email().optional()
  })),
  entryPoint: z.object({
    type: z.enum(['airport', 'hotel', 'check-post', 'other']),
    name: z.string().min(1, 'Entry point name is required'),
    location: z.string().min(1, 'Location is required'),
    timestamp: z.string().min(1, 'Timestamp is required')
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validatedData = TouristIDSchema.parse(body);

    // Validate date logic
    const arrivalDate = new Date(validatedData.tripItinerary.arrivalDate);
    const departureDate = new Date(validatedData.tripItinerary.departureDate);

    if (arrivalDate >= departureDate) {
      return NextResponse.json(
        { error: 'Departure date must be after arrival date' },
        { status: 400 }
      );
    }

    // Issue the Tourist ID using our VC service
    const vcService = new VCService();
    const result = await vcService.issueVC({
      displayName: validatedData.displayName,
      email: validatedData.email,
      phone: validatedData.phone,
      nationality: validatedData.nationality,
      kycInfo: validatedData.kycInfo,
      tripItinerary: validatedData.tripItinerary,
      emergencyContacts: validatedData.emergencyContacts,
      entryPoint: validatedData.entryPoint
    });

    // Anchor the VC on blockchain
    let chainTxHash = null;
    if (process.env.AMOY_RPC_URL && process.env.CHAIN_PRIVATE_KEY) {
      try {
        const chainService = new ChainService({
          rpcUrl: process.env.AMOY_RPC_URL,
          privateKey: process.env.CHAIN_PRIVATE_KEY
        });

        const anchor = await chainService.anchorVC(result.vcJwt);
        chainTxHash = anchor.txHash;

        console.log('Tourist ID anchored on chain:', chainTxHash);
      } catch (chainError) {
        console.error('Chain anchoring failed:', chainError);
        // Continue without chain anchoring in development
      }
    }

    // Store the tourist in database
    try {
      const { error: dbError } = await supabaseAdmin
        .from('tourists')
        .insert({
          display_name: validatedData.displayName,
          email: validatedData.email,
          phone: validatedData.phone,
          nationality: validatedData.nationality,
          vc_jwt: result.vcJwt,
          vc_sha256: result.vcSha256,
          chain_tx_hash: chainTxHash,
          kyc_info: validatedData.kycInfo,
          trip_itinerary: validatedData.tripItinerary,
          emergency_contacts: validatedData.emergencyContacts,
          entry_point: validatedData.entryPoint,
          active: true,
          expires_at: validatedData.tripItinerary.departureDate
        });

      if (dbError) {
        console.log('Database insertion failed (demo mode):', dbError);
        // Continue without database in demo mode
      }
    } catch (dbError) {
      console.log('Database connection failed (demo mode):', dbError);
      // Continue without database in demo mode
    }

    return NextResponse.json({
      vcJwt: result.vcJwt,
      vcSha256: result.vcSha256,
      chainTxHash,
      credential: result.credential,
      touristInfo: validatedData
    });

  } catch (error) {
    console.error('Tourist ID issuance error:', error);

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
