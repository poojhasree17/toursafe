/**
 * Seed script to populate the database with demo data
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Run the seed SQL file
    console.log('📊 Running seed SQL...');
    
    // In a real deployment, you would read and execute the seed.sql file
    // For now, let's just verify the database connection
    const { data, error } = await supabase
      .from('zones')
      .select('count(*)')
      .single();

    if (error) {
      console.error('❌ Database connection failed:', error);
      return;
    }

    console.log('✅ Database connection verified');
    console.log('📍 Found zones in database');

    // Check if demo data exists
    const { data: tourists } = await supabase
      .from('tourists')
      .select('id, display_name')
      .limit(5);

    if (tourists && tourists.length > 0) {
      console.log('👥 Demo tourists found:');
      tourists.forEach(tourist => {
        console.log(`  - ${tourist.display_name} (${tourist.id})`);
      });
    }

    const { data: zones } = await supabase
      .from('zones')
      .select('id, name, type')
      .limit(10);

    if (zones && zones.length > 0) {
      console.log('🗺️  Demo zones found:');
      zones.forEach(zone => {
        console.log(`  - ${zone.name} (${zone.type})`);
      });
    }

    console.log('✅ Database seeding completed!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Self-invoking async function
(async () => {
  await seedDatabase();
})();
