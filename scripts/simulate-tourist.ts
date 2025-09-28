/**
 * Tourist movement simulation script for demo purposes
 */

import { config } from 'dotenv';
import { sleep } from '@toursafe/lib';

// Load environment variables
config({ path: '../.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface TouristSimulation {
  id: string;
  name: string;
  currentLat: number;
  currentLng: number;
  targetLat: number;
  targetLng: number;
  speed: number; // m/s
  scenario: 'normal' | 'restricted' | 'immobile' | 'erratic';
}

// Demo tourist configurations
const TOURISTS: TouristSimulation[] = [
  {
    id: '33333333-3333-3333-3333-333333333333', // Alice from seed data
    name: 'Alice Tourist',
    currentLat: 18.9210,
    currentLng: 72.8350,
    targetLat: 18.9220,
    targetLng: 72.8360,
    speed: 1.2, // Normal walking
    scenario: 'normal'
  },
  {
    id: '44444444-4444-4444-4444-444444444444', // Bob from seed data  
    name: 'Bob Explorer',
    currentLat: 18.9240,
    currentLng: 72.8365,
    targetLat: 18.9255, // Moving toward restricted zone
    targetLng: 72.8385,
    speed: 2.0, // Fast walking
    scenario: 'restricted'
  }
];

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function sendPing(tourist: TouristSimulation): Promise<void> {
  try {
    const bearing = calculateBearing(
      tourist.currentLat, tourist.currentLng,
      tourist.targetLat, tourist.targetLng
    );

    const response = await fetch(`${API_BASE_URL}/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tourist_id: tourist.id,
        lat: tourist.currentLat,
        lng: tourist.currentLng,
        speed: tourist.speed,
        bearing: bearing
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`📍 ${tourist.name}: (${tourist.currentLat.toFixed(6)}, ${tourist.currentLng.toFixed(6)}) speed: ${tourist.speed}m/s`);
    
    if (result.zonesHit && result.zonesHit.length > 0) {
      console.log(`   🚨 Zones hit: ${result.zonesHit.map((z: any) => `${z.name} (${z.type})`).join(', ')}`);
    }
    
    if (result.incidentCreated) {
      console.log(`   ⚠️  Incident created: ${result.incidentCreated.type} (${result.incidentCreated.severity})`);
    }

  } catch (error) {
    console.error(`❌ Failed to send ping for ${tourist.name}:`, error);
  }
}

function updateTouristPosition(tourist: TouristSimulation, timeDelta: number): void {
  const distance = calculateDistance(
    tourist.currentLat, tourist.currentLng,
    tourist.targetLat, tourist.targetLng
  );

  // If very close to target, set new target or change scenario
  if (distance < 10) {
    switch (tourist.scenario) {
      case 'normal':
        // Pick a new random nearby target
        tourist.targetLat = tourist.currentLat + (Math.random() - 0.5) * 0.002;
        tourist.targetLng = tourist.currentLng + (Math.random() - 0.5) * 0.002;
        break;
        
      case 'restricted':
        // Continue toward restricted zone
        tourist.targetLat = 18.9250; // Center of restricted zone
        tourist.targetLng = 72.8380;
        break;
        
      case 'immobile':
        // Stay in place (very small random movement for GPS noise)
        tourist.speed = 0.1;
        tourist.targetLat = tourist.currentLat + (Math.random() - 0.5) * 0.00005;
        tourist.targetLng = tourist.currentLng + (Math.random() - 0.5) * 0.00005;
        break;
        
      case 'erratic':
        // Random direction changes
        tourist.targetLat = tourist.currentLat + (Math.random() - 0.5) * 0.003;
        tourist.targetLng = tourist.currentLng + (Math.random() - 0.5) * 0.003;
        tourist.speed = Math.random() * 3; // Variable speed
        break;
    }
  }

  // Move toward target
  const bearing = calculateBearing(
    tourist.currentLat, tourist.currentLng,
    tourist.targetLat, tourist.targetLng
  );
  
  const moveDistance = tourist.speed * timeDelta; // meters
  const moveDistanceDeg = moveDistance / 111000; // Rough conversion to degrees

  const bearingRad = bearing * Math.PI / 180;
  const latDelta = Math.cos(bearingRad) * moveDistanceDeg;
  const lngDelta = Math.sin(bearingRad) * moveDistanceDeg;

  tourist.currentLat += latDelta;
  tourist.currentLng += lngDelta;
}

async function simulateTourists() {
  console.log('🎭 Starting tourist simulation...');
  console.log('📡 Sending pings every 30 seconds');
  console.log('🗺️  Simulating movement patterns:');
  
  TOURISTS.forEach(tourist => {
    console.log(`   - ${tourist.name}: ${tourist.scenario} behavior`);
  });
  
  console.log('\n🚀 Simulation started. Press Ctrl+C to stop.\n');

  let iteration = 0;
  
  while (true) {
    iteration++;
    console.log(`--- Iteration ${iteration} ---`);
    
    // Update positions and send pings for all tourists
    const promises = TOURISTS.map(async (tourist) => {
      updateTouristPosition(tourist, 30); // 30 second time delta
      await sendPing(tourist);
    });
    
    await Promise.all(promises);
    
    // Special scenario changes
    if (iteration === 10) {
      // After 5 minutes, make Alice immobile
      const alice = TOURISTS.find(t => t.name === 'Alice Tourist');
      if (alice) {
        alice.scenario = 'immobile';
        console.log('🔄 Alice scenario changed to: immobile');
      }
    }
    
    if (iteration === 15) {
      // After 7.5 minutes, make Bob erratic
      const bob = TOURISTS.find(t => t.name === 'Bob Explorer');
      if (bob) {
        bob.scenario = 'erratic';
        console.log('🔄 Bob scenario changed to: erratic');
      }
    }

    console.log(`⏳ Waiting 30 seconds...\n`);
    await sleep(30000); // Wait 30 seconds
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Simulation stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Simulation terminated');
  process.exit(0);
});

// Start simulation
simulateTourists().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});
