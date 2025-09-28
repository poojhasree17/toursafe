/**
 * Test script for Verifiable Credentials functionality
 */

import { config } from 'dotenv';
import { VCService, ChainService } from '@toursafe/lib';

// Load environment variables
config({ path: '../.env.local' });

async function testVCOperations() {
  console.log('🔐 Testing Verifiable Credentials...');

  try {
    const vcService = new VCService();

    // Test 1: Issue a VC
    console.log('\n📋 Test 1: Issuing VC...');
    const vcResult = await vcService.issueVC({
      displayName: 'Test Tourist',
      emergencyContact: '+1-555-0123'
    });

    console.log('✅ VC issued successfully');
    console.log(`   JWT length: ${vcResult.vcJwt.length}`);
    console.log(`   SHA256: ${vcResult.vcSha256}`);
    console.log(`   Subject ID: ${vcResult.credential.credentialSubject.id}`);

    // Test 2: Verify the VC
    console.log('\n🔍 Test 2: Verifying VC...');
    const verifyResult = await vcService.verifyVC(vcResult.vcJwt);

    if (verifyResult.isValid) {
      console.log('✅ VC verification successful');
      console.log(`   Display name: ${verifyResult.credential?.credentialSubject.displayName}`);
    } else {
      console.log('❌ VC verification failed:', verifyResult.error);
    }

    // Test 3: Blockchain anchoring (if configured)
    if (process.env.AMOY_RPC_URL && process.env.CHAIN_PRIVATE_KEY) {
      console.log('\n⛓️  Test 3: Blockchain anchoring...');
      
      const chainService = new ChainService({
        rpcUrl: process.env.AMOY_RPC_URL,
        privateKey: process.env.CHAIN_PRIVATE_KEY
      });

      // Check balance first
      console.log('💰 Checking wallet balance...');
      const balance = await chainService.getBalance();
      console.log(`   Balance: ${balance} MATIC`);

      if (parseFloat(balance) > 0.001) {
        console.log('🔗 Anchoring VC on blockchain...');
        const anchor = await chainService.anchorVC(vcResult.vcJwt);
        console.log('✅ VC anchored on blockchain');
        console.log(`   TX Hash: ${anchor.txHash}`);
        console.log(`   Block: ${anchor.blockNumber}`);

        // Test 4: Verify on-chain proof
        console.log('\n🔍 Test 4: Verifying on-chain proof...');
        const chainVerify = await chainService.verifyVC(vcResult.vcJwt, anchor.txHash);
        
        if (chainVerify.isValid && chainVerify.onChainProof.matched) {
          console.log('✅ On-chain verification successful');
          console.log(`   Block timestamp: ${chainVerify.onChainProof.timestamp}`);
        } else {
          console.log('❌ On-chain verification failed');
        }
      } else {
        console.log('⚠️  Insufficient balance for blockchain operations');
        console.log('   Get test MATIC from: https://faucet.polygon.technology/');
      }
    } else {
      console.log('\n⚠️  Blockchain anchoring skipped (missing configuration)');
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Self-invoking async function
testVCOperations();
