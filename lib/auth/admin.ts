// Tiny helper: is the currently-signed-in user the configured admin?
//
// For the MVP, "admin" is one email address set via ADMIN_EMAIL in the
// environment. Anyone signed in with that email gets admin pages and admin
// API routes; everyone else gets 403.
//
// Later you can replace this with a proper roles table.

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return null;
  if (user.email?.toLowerCase() !== adminEmail.toLowerCase()) return null;
  return user;
}

export async function requireAdmin(): Promise<{ ok: false; reason: string } | { ok: true; userId: string; email: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return {
      ok: false,
      reason:
        "ADMIN_EMAIL is not set in the environment. Set it to your email to gate admin actions.",
    };
  }
  const user = await getAdminUser();
  if (!user) {
    return { ok: false, reason: "Forbidden: caller is not the admin." };
  }
  return { ok: true, userId: user.id, email: user.email ?? "" };
}
