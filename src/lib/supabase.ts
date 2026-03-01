import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseEnv(): { url: string; anonKey: string } {
  // During static build time, Next.js may hit this path without full env vars
  if (!_supabaseUrl?.trim()) {
    console.warn("Missing NEXT_PUBLIC_SUPABASE_URL");
    return { url: "http://localhost:54321", anonKey: "dummy_anon_key" };
  }
  if (!_supabaseAnonKey?.trim()) {
    console.warn("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return { url: _supabaseUrl, anonKey: "dummy_anon_key" };
  }
  return { url: _supabaseUrl, anonKey: _supabaseAnonKey };
}

/**
 * Creates a Supabase client for use in the browser (Client Components).
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClientSSR(url, anonKey);
}

/**
 * Creates a Supabase admin client with service role key.
 * This bypasses Row Level Security and should only be used server-side.
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey?.trim()) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
