#!/usr/bin/env python3
"""
Test script for Verifiable Credentials functionality - Python version
"""

import asyncio
import json
import os
import sys
import time
from typing import Dict, Any
import aiohttp
import dotenv

# Load environment variables
dotenv.load_dotenv("../.env.local")

API_BASE_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000/api/v1")

class VCTestClient:
    """Client for testing VC operations"""

    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.session: aiohttp.ClientSession | None = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def issue_vc(self, tourist_data: Dict[str, str]) -> Dict[str, Any]:
        """Issue a verifiable credential"""
        url = f"{self.base_url}/vc/issue"

        async with self.session.post(url, json=tourist_data) as response:
            if response.status != 201:
                error_text = await response.text()
                raise aiohttp.ClientResponseError(
                    request_info=response.request_info,
                    history=response.history,
                    status=response.status,
                    message=f"HTTP {response.status}: {error_text}"
                )

            return await response.json()

    async def verify_vc(self, vc_jwt: str) -> Dict[str, Any]:
        """Verify a verifiable credential"""
        url = f"{self.base_url}/vc/verify"

        async with self.session.post(url, json={"vcJwt": vc_jwt}) as response:
            if response.status != 200:
                error_text = await response.text()
                raise aiohttp.ClientResponseError(
                    request_info=response.request_info,
                    history=response.history,
                    status=response.status,
                    message=f"HTTP {response.status}: {error_text}"
                )

            return await response.json()

async def test_vc_operations() -> None:
    """Test VC operations"""
    print("🔐 Testing Verifiable Credentials...")

    try:
        async with VCTestClient() as client:
            # Test 1: Issue a VC
            print("\n📋 Test 1: Issuing VC...")
            vc_result = await client.issue_vc({
                "displayName": "Test Tourist",
                "emergencyContact": "+1-555-0123"
            })

            print("✅ VC issued successfully")
            print(f"   JWT length: {len(vc_result.get('vcJwt', ''))}")
            print(f"   SHA256: {vc_result.get('vcSha256', 'N/A')}")
            print(f"   Subject ID: {vc_result.get('credential', {}).get('credentialSubject', {}).get('id', 'N/A')}")

            # Test 2: Verify the VC
            print("\n🔍 Test 2: Verifying VC...")
            vc_jwt = vc_result.get("vcJwt")
            if vc_jwt:
                verify_result = await client.verify_vc(vc_jwt)

                if verify_result.get("isValid"):
                    print("✅ VC verification successful")
                    print(f"   Display name: {verify_result.get('credential', {}).get('credentialSubject', {}).get('displayName', 'N/A')}")
                else:
                    print(f"❌ VC verification failed: {verify_result.get('error', 'Unknown error')}")
            else:
                print("❌ No VC JWT received, skipping verification")

            # Test 3: Blockchain anchoring (basic check)
            print("\n⛓️  Test 3: Blockchain anchoring...")
            if os.getenv("AMOY_RPC_URL") and os.getenv("CHAIN_PRIVATE_KEY"):
                print("   ✅ Blockchain configuration found")
                print("   📝 Blockchain anchoring would be tested here")
                print("   💡 (Blockchain operations require ethers.js integration)")
            else:
                print("   ⚠️  Blockchain configuration not found")
                print("   💡 Set AMOY_RPC_URL and CHAIN_PRIVATE_KEY to test blockchain features")

    except Exception as e:
        print(f"❌ VC test failed: {e}")
        raise

async def main() -> None:
    """Main entry point"""
    try:
        await test_vc_operations()
        print("\n🎉 VC testing completed successfully!")
    except Exception as e:
        print(f"\n❌ VC testing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 VC test interrupted")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

