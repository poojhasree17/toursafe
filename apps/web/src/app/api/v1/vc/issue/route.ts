import { NextRequest, NextResponse } from 'next/server';
import { IssueVCSchema, ChainService, VCService } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, emergencyContact } = IssueVCSchema.parse(body);

    // Issue the VC using our VC service
    const vcService = new VCService();
    const result = await vcService.issueVC({
      displayName,
      emergencyContact
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
        
        console.log('VC anchored on chain:', chainTxHash);
      } catch (chainError) {
        console.error('Chain anchoring failed:', chainError);
        // Continue without chain anchoring in development
      }
    }

    // Store the tourist in database (demo mode - skip if no database)
    try {
      const { error: dbError } = await supabaseAdmin
        .from('tourists')
        .insert({
          display_name: displayName,
          vc_jwt: result.vcJwt,
          vc_sha256: result.vcSha256,
          chain_tx_hash: chainTxHash,
          emergency_contact: emergencyContact,
          active: true
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
      credential: result.credential
    });

  } catch (error) {
    console.error('VC issuance error:', error);
    
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
