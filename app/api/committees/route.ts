// Read-only list of committees inside the seeded institution. Token-authed
// so MCP / external agents can target packets correctly.

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/services/api-tokens";

export async function GET(req: Request) {
  const presented = req.headers.get("x-republic-token");
  if (!presented) {
    return NextResponse.json(
      { error: "Missing X-Republic-Token header." },
      { status: 401 },
    );
  }
  const admin = createSupabaseAdminClient();
  const auth = await verifyToken(admin, presented);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or revoked token." },
      { status: 401 },
    );
  }

  const { data: committees, error } = await admin
    .from("committees")
    .select("id, name, description, domain, access_level, institution_id")
    .order("name");
  if (error) {
    return NextResponse.json(
      { error: "Failed to read committees." },
      { status: 500 },
    );
  }
  return NextResponse.json({ committees: committees ?? [] });
}
