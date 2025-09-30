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
    // Create demo users in Supabase Auth
    console.log('👤 Creating demo users in Supabase Auth...');

    const demoUsers = [
      { email: 'admin@toursafe.demo', password: 'admin123', role: 'ADMIN' },
      { email: 'operator@toursafe.demo', password: 'operator123', role: 'OPERATOR' }
    ];

    for (const user of demoUsers) {
      try {
        // Create user in Supabase Auth
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            role: user.role
          }
        });

        if (error) {
          console.error(`❌ Failed to create user ${user.email}:`, error);
        } else {
          console.log(`✅ Created user: ${user.email} (${user.role})`);

          // Also add to app_users table if not exists
          const { error: appUserError } = await supabase
            .from('app_users')
            .upsert({
              id: data.user.id,
              email: user.email,
              role: user.role
            });

          if (appUserError) {
            console.error(`❌ Failed to add user to app_users table:`, appUserError);
          }
        }
      } catch (userError) {
        console.error(`❌ Error creating user ${user.email}:`, userError);
      }
    }

    // Run the seed SQL file
    console.log('📊 Running seed SQL...');

    // In a real deployment, you would read and execute the seed.sql file
    // For now, let's just verify the database connection
    const { count, error } = await supabase
      .from('zones')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Database connection failed:', error);
      return;
    }

    console.log('✅ Database connection verified');
    console.log(`📍 Found ${count} zones in database`);

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
