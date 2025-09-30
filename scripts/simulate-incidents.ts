/**
 * Incident simulation script for demo purposes
 * Generates various types of incidents for demonstration
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '../.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Demo incident configurations
const INCIDENTS = [
  {
    touristId: '33333333-3333-3333-3333-333333333333', // Alice
    type: 'SOS',
    lat: 18.9215,
    lng: 72.8355,
    severity: 'HIGH',
    description: 'Emergency SOS activated'
  },
  {
    touristId: '44444444-4444-4444-4444-444444444444', // Bob
    type: 'RESTRICTED',
    lat: 18.9250,
    lng: 72.8380,
    severity: 'MEDIUM',
    description: 'Entered restricted naval area'
  }
];

async function createIncident(incident: typeof INCIDENTS[0]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(incident)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`🚨 Created incident: ${incident.type} for tourist ${incident.touristId}`);
    console.log(`   📍 Location: (${incident.lat}, ${incident.lng})`);
    console.log(`   📊 Severity: ${incident.severity}`);
    console.log(`   💬 Description: ${incident.description}`);
    console.log(`   🆔 Incident ID: ${result.id}\n`);

  } catch (error) {
    console.error(`❌ Failed to create incident:`, error);
  }
}

async function simulateIncidents(): Promise<void> {
  console.log('🚨 Starting incident simulation...');
  console.log('📋 Will create the following incidents:');

  INCIDENTS.forEach((incident, index) => {
    console.log(`   ${index + 1}. ${incident.type} incident for tourist ${incident.touristId}`);
  });

  console.log('\n🎯 Creating incidents...\n');

  // Create incidents with delays for realistic demo
  for (let i = 0; i < INCIDENTS.length; i++) {
    await createIncident(INCIDENTS[i]);

    // Wait between incidents (except for the last one)
    if (i < INCIDENTS.length - 1) {
      console.log(`⏳ Waiting 5 seconds before next incident...\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('✅ All incidents created successfully!');
  console.log('🎭 Demo simulation complete.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Incident simulation stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Incident simulation terminated');
  process.exit(0);
});

// Start simulation
simulateIncidents().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});

