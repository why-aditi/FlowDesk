import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase";

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
