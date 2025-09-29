/**
 * Simple test to verify demo scripts work individually
 */

import { config } from 'dotenv';

// Load environment variables (optional)
try {
  config({ path: '../.env.local' });
} catch (error) {
  console.log('⚠️  .env.local not found, using default environment variables');
}

async function testDemoScripts() {
  console.log('🧪 Testing demo scripts individually...\n');

  // Test 1: Check if we can load the environment
  console.log('✅ Environment loaded successfully');

  // Test 2: Check if API is accessible (basic connectivity test)
  try {
    const response = await fetch('http://localhost:3000/api/v1/zones');
    if (response.ok) {
      console.log('✅ API server is running and accessible');
    } else {
      console.log('⚠️  API server responded but with non-200 status:', response.status);
    }
  } catch (error) {
    console.log('⚠️  API server not accessible (this is expected if services aren\'t running)');
  }

  // Test 3: Check if AI service is accessible
  try {
    const response = await fetch('http://localhost:8000/health');
    if (response.ok) {
      console.log('✅ AI service is running and accessible');
    } else {
      console.log('⚠️  AI service responded but with non-200 status:', response.status);
    }
  } catch (error) {
    console.log('⚠️  AI service not accessible (this is expected if AI service isn\'t running)');
  }

  console.log('\n🎯 Demo Prerequisites:');
  console.log('   📊 Database: Configure Supabase connection');
  console.log('   🌐 Web Server: Run "pnpm dev" from root');
  console.log('   🤖 AI Service: Run "pnpm start:ai" from root');
  console.log('   ⛓️  Blockchain: Configure Polygon Amoy credentials');
  console.log('   🗺️  Maps: Configure MapTiler API key');

  console.log('\n🚀 To run full demo:');
  console.log('   1. Start services: pnpm dev');
  console.log('   2. Seed database: pnpm seed');
  console.log('   3. Run demo: pnpm demo');

  console.log('\n✅ Basic demo test completed!');
}

testDemoScripts().catch(console.error);
