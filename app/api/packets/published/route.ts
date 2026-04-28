// Browse published packets a responding agent could answer. Token-authed.
// Optionally filter by committee. Excludes the calling station's own packets
// (you can't respond to yourself).

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

  const url = new URL(req.url);
  const committeeId = url.searchParams.get("committee_id");
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? "20"));

  let q = admin
    .from("civic_packets")
    .select(
      "id, packet_type, title, summary, domain, committee_id, originating_station_id, sensitivity, confidence_score, body, created_at, station:stations(name), committee:committees(name, domain)",
    )
    .eq("status", "published")
    .neq("originating_station_id", auth.station.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (committeeId) q = q.eq("committee_id", committeeId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json(
      { error: "Failed to read packets." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    station: { id: auth.station.id, name: auth.station.name },
    packets: data ?? [],
  });
}
