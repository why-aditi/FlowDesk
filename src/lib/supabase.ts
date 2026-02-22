import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";
import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { cookies } from "next/headers";

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseEnv(): { url: string; anonKey: string } {
  if (!_supabaseUrl?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!_supabaseAnonKey?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
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
 * Creates a Supabase client for use on the server (Server Components, Route Handlers, Server Actions).
 * Uses cookies from next/headers for auth. Call in an async context.
 */
export async function createServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClientSSR(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll from Server Component can throw; middleware handles session refresh
        }
      },
    },
  });
}
