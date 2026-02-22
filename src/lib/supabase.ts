import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";
import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client for use in the browser (Client Components).
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createBrowserClient() {
  return createBrowserClientSSR(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client for use on the server (Server Components, Route Handlers, Server Actions).
 * Uses cookies from next/headers for auth. Call in an async context.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createServerClientSSR(supabaseUrl, supabaseAnonKey, {
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
