import { createClient } from '@supabase/supabase-js';

// Demo mode - use placeholder values if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for server-side operations (use carefully!)
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Mock data for demo when Supabase is not available
export const mockData = {
  app_users: [
    { id: '11111111-1111-1111-1111-111111111111', email: 'admin@toursafe.demo', role: 'ADMIN' },
    { id: '22222222-2222-2222-2222-222222222222', email: 'operator@toursafe.demo', role: 'OPERATOR' }
  ],
  tourists: [
    {
      id: '33333333-3333-3333-3333-333333333333',
      display_name: 'Alice Tourist',
      vc_jwt: 'demo-vc-jwt',
      vc_sha256: 'demo-sha256',
      emergency_contact: '+1234567890',
      lang: 'en'
    }
  ],
  zones: [
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Gateway of India Safe Zone',
      type: 'SAFE',
      polygon_geojson: '{"type": "MultiPolygon", "coordinates": [[[[72.8347, 18.9220], [72.8360, 18.9220], [72.8360, 18.9200], [72.8347, 18.9200], [72.8347, 18.9220]]]]}'
    }
  ],
  incidents: [
    {
      id: '88888888-8888-8888-8888-888888888888',
      tourist_id: '44444444-4444-4444-4444-444444444444',
      type: 'RESTRICTED',
      severity: 'MEDIUM',
      ts: new Date().toISOString(),
      lat: 18.9248,
      lng: 72.8378,
      status: 'OPEN',
      meta: '{"zone_id": "66666666-6666-6666-6666-666666666666", "zone_name": "Naval Restricted Area", "auto_generated": true}'
    }
  ]
};