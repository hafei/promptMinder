// Lazy supabase client factory
// Note: In server-side context (API routes), prefer SUPABASE_URL/SUPABASE_ANON_KEY
// which are read at runtime. NEXT_PUBLIC_ vars are baked in at build time.
import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  // Prefer server-side env vars (runtime) over NEXT_PUBLIC_ (build-time)
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Missing Supabase environment variables: SUPABASE_URL/SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

