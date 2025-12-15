// Lazy supabase client factory for client-side usage
import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  // Use NEXT_PUBLIC_ prefixed env vars for client-side access
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Missing Supabase client environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

