import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createBaseClient } from "@supabase/supabase-js";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

/** Server-side Supabase client bound to the current request's auth cookies. */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignored: Server Components can't write cookies. Auth refresh
            // happens via middleware in the request flow.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // see above
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS. Use ONLY in server actions / API
 * routes for operations that need elevated privilege (seed, audit writes,
 * scanner persistence). Never expose to the client.
 */
export function createSupabaseAdminClient() {
  return createBaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
