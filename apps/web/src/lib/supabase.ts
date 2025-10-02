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
      name: 'Gateway of India Area',
      type: 'SAFE',
      polygon_geojson: {
        "type": "MultiPolygon",
        "coordinates": [[[
          [72.8330, 18.9230],
          [72.8360, 18.9230],
          [72.8360, 18.9200],
          [72.8330, 18.9200],
          [72.8330, 18.9230]
        ]]]
      },
      description: 'Tourist area around Gateway of India',
      riskLevel: 'LOW',
      incidentCount: 2
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'Mumbai Naval Base Restricted Zone',
      type: 'RESTRICTED',
      polygon_geojson: {
        "type": "MultiPolygon",
        "coordinates": [[[
          [72.8370, 18.9250],
          [72.8420, 18.9250],
          [72.8420, 18.9180],
          [72.8370, 18.9180],
          [72.8370, 18.9250]
        ]]]
      },
      description: 'Restricted naval area - entry prohibited',
      riskLevel: 'HIGH',
      incidentCount: 15
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      name: 'Colaba Market Alert Zone',
      type: 'ALERT',
      polygon_geojson: {
        "type": "MultiPolygon",
        "coordinates": [[[
          [72.8300, 18.9180],
          [72.8350, 18.9180],
          [72.8350, 18.9100],
          [72.8300, 18.9100],
          [72.8300, 18.9180]
        ]]]
      },
      description: 'Busy market area - be cautious of pickpockets',
      riskLevel: 'MEDIUM',
      incidentCount: 8
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