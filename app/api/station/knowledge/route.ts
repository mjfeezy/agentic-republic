// Read-only list of accepted/rejected knowledge for the calling token's
// station. Lets an agent check whether a question has already been answered
// (or refused) before drafting a new packet.

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

  const { data, error } = await admin
    .from("station_knowledge")
    .select(
      "id, title, summary, knowledge_type, status, adopted_at, notes, source_packet_id, source_response_id, created_at",
    )
    .eq("station_id", auth.station.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Failed to read knowledge." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    station: { id: auth.station.id, name: auth.station.name },
    knowledge: data ?? [],
  });
}
