import { NextRequest, NextResponse } from 'next/server';
import { VerifyVCSchema, ChainService, VCService } from '@toursafe/lib';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vcJwt } = VerifyVCSchema.parse(body);

    // Verify the VC signature
    const vcService = new VCService();
    const vcResult = await vcService.verifyVC(vcJwt);

    if (!vcResult.isValid) {
      return NextResponse.json({
        isValid: false,
        error: vcResult.error || 'Invalid VC signature',
        onChainProof: null
      });
    }

    // Look up the tourist in database to get chain tx hash
    const vcSha256 = ChainService.hashVC(vcJwt);
    const { data: tourist, error: dbError } = await supabaseAdmin
      .from('tourists')
      .select('chain_tx_hash, display_name, active')
      .eq('vc_sha256', vcSha256)
      .single();

    if (dbError || !tourist) {
      console.error('Tourist lookup failed:', dbError);
      return NextResponse.json({
        isValid: true, // VC signature is valid
        onChainProof: {
          txHash: null,
          matched: false,
          error: 'VC not found in database'
        }
      });
    }

    // Verify on-chain proof if available
    let onChainProof = {
      txHash: tourist.chain_tx_hash,
      matched: false,
      blockNumber: undefined as number | undefined,
      timestamp: undefined as Date | undefined,
      error: undefined as string | undefined
    };

    if (tourist.chain_tx_hash && process.env.AMOY_RPC_URL && process.env.CHAIN_PRIVATE_KEY) {
      try {
        const chainService = new ChainService({
          rpcUrl: process.env.AMOY_RPC_URL,
          privateKey: process.env.CHAIN_PRIVATE_KEY
        });

        const chainResult = await chainService.verifyVC(vcJwt, tourist.chain_tx_hash);
        onChainProof = {
          txHash: tourist.chain_tx_hash,
          matched: chainResult.onChainProof.matched,
          blockNumber: chainResult.onChainProof.blockNumber,
          timestamp: chainResult.onChainProof.timestamp
        };
      } catch (chainError) {
        console.error('Chain verification failed:', chainError);
        onChainProof.error = 'Chain verification failed';
      }
    }

    return NextResponse.json({
      isValid: true,
      credential: vcResult.credential,
      tourist: {
        displayName: tourist.display_name,
        active: tourist.active
      },
      onChainProof
    });

  } catch (error) {
    console.error('VC verification error:', error);
    
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
