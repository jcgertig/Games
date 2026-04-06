/**
 * Single browser-side Supabase anon client shared across the whole app.
 *
 * Importing this module more than once is safe — the module system caches the
 * result, so `_instance` is truly a singleton even across dynamic imports.
 * All code that needs a browser Supabase client should call `getAnonClient()`
 * rather than calling `createClient()` directly, so there is never more than
 * one GoTrueClient registered in localStorage.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _instance: SupabaseClient | null = null;

export function getAnonClient(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _instance;
}
