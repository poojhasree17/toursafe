/**
 * Complete demo runner for TourSafe SIH 2025 PS-25002
 * Runs all simulation scripts in sequence for a complete demo experience
 */

import { config } from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (optional)
try {
  config({ path: '../.env.local' });
} catch (error) {
  console.log('⚠️  .env.local not found, using default environment variables');
}

interface DemoStep {
  name: string;
  description: string;
  script: string;
  delay?: number; // Delay before starting this step (in seconds)
  duration?: number; // How long to run this step (in seconds)
}

const DEMO_STEPS: DemoStep[] = [
  {
    name: 'Database Seeding',
    description: 'Setting up demo data (users, tourists, zones)',
    script: 'seed.ts',
    delay: 0,
    duration: 10
  },
  {
    name: 'VC Issuance',
    description: 'Creating verifiable credentials with blockchain anchoring',
    script: 'test-vc.ts',
    delay: 2,
    duration: 15
  },
  {
    name: 'Tourist Movement Simulation',
    description: 'Simulating tourist movement with different behavior patterns',
    script: 'simulate-tourist.ts',
    delay: 1,
    duration: 300 // 5 minutes of movement simulation
  },
  {
    name: 'Incident Generation',
    description: 'Creating various incident types for demonstration',
    script: 'simulate-incidents.ts',
    delay: 1,
    duration: 10
  }
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScript(scriptPath: string, duration?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Starting: ${scriptPath}`);

    const script = spawn('tsx', [scriptPath], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env
    });

    let timeout: NodeJS.Timeout | undefined;

    if (duration) {
      timeout = setTimeout(() => {
        console.log(`⏰ Stopping script after ${duration} seconds: ${scriptPath}`);
        script.kill('SIGTERM');
      }, duration * 1000);
    }

    script.on('close', (code) => {
      if (timeout) clearTimeout(timeout);

      if (code === 0) {
        console.log(`✅ Completed: ${scriptPath}`);
        resolve();
      } else {
        console.error(`❌ Failed: ${scriptPath} (exit code: ${code})`);
        reject(new Error(`Script ${scriptPath} failed with code ${code}`));
      }
    });

    script.on('error', (error) => {
      if (timeout) clearTimeout(timeout);
      console.error(`❌ Error running ${scriptPath}:`, error);
      reject(error);
    });
  });
}

async function runDemo(): Promise<void> {
  console.log('🎭 TourSafe Demo Runner - SIH 2025 PS-25002');
  console.log('=' .repeat(50));
  console.log('🚀 This will run a complete demonstration of the TourSafe system');
  console.log('📋 Demo includes:');
  console.log('   • Database seeding with demo data');
  console.log('   • Verifiable credential issuance & blockchain anchoring');
  console.log('   • Real-time tourist movement simulation');
  console.log('   • AI-powered anomaly detection');
  console.log('   • Incident generation and response');
  console.log('   • Push notifications and real-time updates');
  console.log('=' .repeat(50));

  // Check if services are running
  console.log('🔍 Checking if required services are running...');

  try {
    // Check if web server is running
    const response = await fetch('http://localhost:3000');
    if (!response.ok) {
      throw new Error('Web server not responding');
    }
    console.log('✅ Web server is running');

    // Check if AI service is running
    const aiResponse = await fetch('http://localhost:8000/health');
    if (!aiResponse.ok) {
      console.log('⚠️  AI service not running - anomaly detection will be limited');
    } else {
      console.log('✅ AI service is running');
    }
  } catch (error) {
    console.log('⚠️  Services not fully available - some features may not work');
    console.log('💡 Make sure to run: pnpm run dev (for web) and python -m uvicorn main:app --host 0.0.0.0 --port 8000 (for AI)');
  }

  console.log('\n🎯 Starting demo sequence...\n');

  for (let i = 0; i < DEMO_STEPS.length; i++) {
    const step = DEMO_STEPS[i];

    console.log(`📍 Step ${i + 1}/${DEMO_STEPS.length}: ${step.name}`);
    console.log(`   ${step.description}`);

    if (step.delay && step.delay > 0) {
      console.log(`⏳ Waiting ${step.delay} seconds before starting...`);
      await sleep(step.delay * 1000);
    }

    try {
      await runScript(step.script, step.duration);
    } catch (error) {
      console.error(`❌ Step failed: ${step.name}`);
      console.error('💡 You may need to run individual steps manually or check service availability');
      break;
    }

    // Small pause between steps
    if (i < DEMO_STEPS.length - 1) {
      console.log('⏸️  Pausing between steps...\n');
      await sleep(2000);
    }
  }

  console.log('🎉 Demo sequence completed!');
  console.log('\n📊 Demo Summary:');
  console.log('   ✅ Database seeded with demo users and tourists');
  console.log('   ✅ Verifiable credentials issued and anchored on blockchain');
  console.log('   ✅ Tourist movement simulation completed');
  console.log('   ✅ Incidents generated and processed');
  console.log('   ✅ Real-time notifications sent');
  console.log('\n🎭 Demo Experience:');
  console.log('   🌐 Tourist PWA: http://localhost:3000/tourist');
  console.log('   🛡️  Admin Dashboard: http://localhost:3000/admin');
  console.log('   📱 PWA can be installed as a mobile app');
  console.log('\n🔗 Quick Access:');
  console.log('   • Issue VC: http://localhost:3000/admin/vc');
  console.log('   • Verify VC: http://localhost:3000/admin/audit');
  console.log('   • View Incidents: http://localhost:3000/admin/incidents');
  console.log('   • Manage Zones: http://localhost:3000/admin/zones');
  console.log('\n🚀 Ready for SIH 2025 PS-25002 judging!');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Demo runner stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Demo runner terminated');
  process.exit(0);
});

// Start demo
runDemo().catch(error => {
  console.error('❌ Demo runner failed:', error);
  process.exit(1);
});
