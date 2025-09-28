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
