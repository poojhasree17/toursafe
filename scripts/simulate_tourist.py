#!/usr/bin/env python3
"""
Tourist movement simulation script - Python version
Demonstrates cleaner geospatial calculations and async handling
"""

import asyncio
import json
import math
import os
import random
import time
from typing import List, Dict, Any
import aiohttp
import dotenv
from dataclasses import dataclass, field

# Load environment variables
dotenv.load_dotenv("../.env.local")

API_BASE_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000/api/v1")

@dataclass
class TouristSimulation:
    """Tourist simulation with movement patterns"""
    id: str
    name: str
    current_lat: float
    current_lng: float
    target_lat: float
    target_lng: float
    speed: float  # m/s
    scenario: str = "normal"

    def calculate_bearing(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate bearing between two points using geopy-like logic"""
        d_lng = math.radians(lng2 - lng1)
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)

        y = math.sin(d_lng) * math.cos(lat2_rad)
        x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(d_lng)

        bearing = math.atan2(y, x)
        return (math.degrees(bearing) + 360) % 360

    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance in meters using haversine formula"""
        R = 6371000  # Earth radius in meters
        d_lat = math.radians(lat2 - lat1)
        d_lng = math.radians(lng2 - lng1)

        a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def update_position(self, time_delta: float) -> None:
        """Update tourist position based on current scenario"""
        distance = self.calculate_distance(
            self.current_lat, self.current_lng,
            self.target_lat, self.target_lng
        )

        # If very close to target, set new target based on scenario
        if distance < 10:
            self._set_new_target()

        # Move toward target
        bearing = self.calculate_bearing(
            self.current_lat, self.current_lng,
            self.target_lat, self.target_lng
        )

        move_distance = self.speed * time_delta  # meters
        move_distance_deg = move_distance / 111000  # Rough conversion to degrees

        bearing_rad = math.radians(bearing)
        lat_delta = math.cos(bearing_rad) * move_distance_deg
        lng_delta = math.sin(bearing_rad) * move_distance_deg

        self.current_lat += lat_delta
        self.current_lng += lng_delta

    def _set_new_target(self) -> None:
        """Set new target based on current scenario"""
        if self.scenario == "normal":
            # Pick a new random nearby target
            self.target_lat = self.current_lat + (random.random() - 0.5) * 0.002
            self.target_lng = self.current_lng + (random.random() - 0.5) * 0.002

        elif self.scenario == "restricted":
            # Continue toward restricted zone
            self.target_lat = 18.9250  # Center of restricted zone
            self.target_lng = 72.8380

        elif self.scenario == "immobile":
            # Stay in place with small GPS noise
            self.speed = 0.1
            self.target_lat = self.current_lat + (random.random() - 0.5) * 0.00005
            self.target_lng = self.current_lng + (random.random() - 0.5) * 0.00005

        elif self.scenario == "erratic":
            # Random direction changes
            self.target_lat = self.current_lat + (random.random() - 0.5) * 0.003
            self.target_lng = self.current_lng + (random.random() - 0.5) * 0.003
            self.speed = random.random() * 3  # Variable speed

    async def send_ping(self, session: aiohttp.ClientSession) -> None:
        """Send GPS ping to API"""
        try:
            bearing = self.calculate_bearing(
                self.current_lat, self.current_lng,
                self.target_lat, self.target_lng
            )

            payload = {
                "tourist_id": self.id,
                "lat": self.current_lat,
                "lng": self.current_lng,
                "speed": self.speed,
                "bearing": bearing
            }

            async with session.post(f"{API_BASE_URL}/ping", json=payload) as response:
                if response.status != 200:
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status,
                        message=f"HTTP {response.status}"
                    )

                result = await response.json()

            print(f"📍 {self.name}: ({self.current_lat:.6f}, {self.current_lng:.6f}) speed: {self.speed:.1f}m/s")

            if result.get("zonesHit"):
                zones = [f"{z['name']} ({z['type']})" for z in result["zonesHit"]]
                print(f"   🚨 Zones hit: {', '.join(zones)}")

            if result.get("incidentCreated"):
                incident = result["incidentCreated"]
                print(f"   ⚠️  Incident: {incident['type']} ({incident['severity']})")

        except Exception as e:
            print(f"❌ Failed to send ping for {self.name}: {e}")

# Demo tourist configurations
TOURISTS = [
    TouristSimulation(
        id="33333333-3333-3333-3333-333333333333",
        name="Alice Tourist",
        current_lat=18.9210,
        current_lng=72.8350,
        target_lat=18.9220,
        target_lng=72.8360,
        speed=1.2,
        scenario="normal"
    ),
    TouristSimulation(
        id="44444444-4444-4444-4444-444444444444",
        name="Bob Explorer",
        current_lat=18.9240,
        current_lng=72.8365,
        target_lat=18.9255,
        target_lng=72.8385,
        speed=2.0,
        scenario="restricted"
    )
]

async def simulate_tourists() -> None:
    """Main simulation loop"""
    print("🎭 Starting tourist simulation...")
    print("📡 Sending pings every 30 seconds")

    scenarios = [t.scenario for t in TOURISTS]
    print("🗺️  Simulating movement patterns:")
    for tourist in TOURISTS:
        print(f"   - {tourist.name}: {tourist.scenario} behavior")

    print("\n🚀 Simulation started. Press Ctrl+C to stop.\n")

    iteration = 0

    # Create aiohttp session for connection reuse
    async with aiohttp.ClientSession() as session:
        while True:
            iteration += 1
            print(f"--- Iteration {iteration} ---")

            # Update positions and send pings for all tourists
            tasks = []
            for tourist in TOURISTS:
                tourist.update_position(30)  # 30 second time delta
                tasks.append(tourist.send_ping(session))

            await asyncio.gather(*tasks)

            # Special scenario changes
            if iteration == 10:
                alice = next(t for t in TOURISTS if t.name == "Alice Tourist")
                alice.scenario = "immobile"
                print("🔄 Alice scenario changed to: immobile")

            if iteration == 15:
                bob = next(t for t in TOURISTS if t.name == "Bob Explorer")
                bob.scenario = "erratic"
                print("🔄 Bob scenario changed to: erratic")

            print("⏳ Waiting 30 seconds...\n")
            await asyncio.sleep(30)

def signal_handler():
    """Handle graceful shutdown"""
    print("\n🛑 Simulation stopped by user")
    exit(0)

if __name__ == "__main__":
    import signal
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        asyncio.run(simulate_tourists())
    except Exception as e:
        print(f"❌ Simulation failed: {e}")
        exit(1)
