import { AppShell } from "@/components/civic/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <AppShell userEmail={user?.email ?? null}>{children}</AppShell>;
}
