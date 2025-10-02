#!/usr/bin/env python3
"""
Incident simulation script for demo purposes - Python version
Generates various types of incidents for demonstration
"""

import asyncio
import json
import os
import signal
import sys
import time
from typing import Dict, List, Any
import aiohttp
import dotenv

# Load environment variables
dotenv.load_dotenv("../.env.local")

API_BASE_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000/api/v1")

# Demo incident configurations
INCIDENTS = [
    {
        "tourist_id": "33333333-3333-3333-3333-333333333333",  # Alice
        "type": "SOS",
        "lat": 18.9215,
        "lng": 72.8355,
        "severity": "HIGH",
        "description": "Emergency SOS activated"
    },
    {
        "tourist_id": "44444444-4444-4444-4444-444444444444",  # Bob
        "type": "RESTRICTED",
        "lat": 18.9250,
        "lng": 72.8380,
        "severity": "MEDIUM",
        "description": "Entered restricted naval area"
    }
]

class IncidentSimulator:
    """Handles incident creation and simulation"""

    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.session: aiohttp.ClientSession | None = None

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def create_incident(self, incident: Dict[str, Any]) -> None:
        """Create a single incident"""
        try:
            url = f"{self.base_url}/incidents"

            async with self.session.post(url, json=incident) as response:
                if response.status != 201:
                    error_text = await response.text()
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status,
                        message=f"HTTP {response.status}: {error_text}"
                    )

                result = await response.json()

            print(f"🚨 Created incident: {incident['type']} for tourist {incident['tourist_id']}")
            print(f"   📍 Location: ({incident['lat']}, {incident['lng']})")
            print(f"   📊 Severity: {incident['severity']}")
            print(f"   💬 Description: {incident['description']}")
            print(f"   🆔 Incident ID: {result.get('incident', {}).get('id', 'Unknown')}\n")

        except Exception as e:
            print(f"❌ Failed to create incident: {e}")
            raise

    async def simulate_incidents(self) -> None:
        """Main simulation function"""
        print("🚨 Starting incident simulation...")
        print("📋 Will create the following incidents:")

        for i, incident in enumerate(INCIDENTS, 1):
            print(f"   {i}. {incident['type']} incident for tourist {incident['tourist_id']}")

        print("\n🎯 Creating incidents...\n")

        # Create incidents with delays for realistic demo
        for i, incident in enumerate(INCIDENTS):
            await self.create_incident(incident)

            # Wait between incidents (except for the last one)
            if i < len(INCIDENTS) - 1:
                print(f"⏳ Waiting 5 seconds before next incident...\n")
                await asyncio.sleep(5)

        print("✅ All incidents created successfully!")
        print("🎭 Demo simulation complete.")

def signal_handler(signum, frame):
    """Handle graceful shutdown"""
    print("\n🛑 Incident simulation stopped by user")
    sys.exit(0)

async def main() -> None:
    """Main entry point"""
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        async with IncidentSimulator() as simulator:
            await simulator.simulate_incidents()
    except KeyboardInterrupt:
        print("\n🛑 Incident simulation interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Simulation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Simulation interrupted")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

