// Read-only status endpoint. An external agent that just submitted a packet
// polls here to find out whether the packet was admitted, what the latest
// scan decision was, what responses came back, and whether anything has
// been ratified locally yet.
//
// Token-authed: the bearer token must belong to the same station that
// originated the packet (no cross-station snooping over the API).

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/services/api-tokens";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
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

  const { data: packet } = await admin
    .from("civic_packets")
    .select(
      "id, title, status, scan_status, quarantine_status, originating_station_id, representative_id, created_at, updated_at",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!packet) {
    return NextResponse.json({ error: "Packet not found." }, { status: 404 });
  }
  if (packet.originating_station_id !== auth.station.id) {
    return NextResponse.json(
      { error: "Token is not authorized for this packet's station." },
      { status: 403 },
    );
  }

  const [scan, responses, ratifications] = await Promise.all([
    admin
      .from("baggage_scans")
      .select(
        "id, decision, risk_score, risk_level, explanation, created_at",
      )
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("packet_responses")
      .select(
        "id, response_type, summary, proposed_pattern, implementation_steps, risks, confidence_score, created_at, representative:representatives(name, station_id)",
      )
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: false }),
    admin
      .from("ratification_requests")
      .select(
        "id, title, status, decision, decision_notes, recommendation_summary, proposed_change_type, risk_level, created_at, decided_at",
      )
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    packet,
    latest_scan: scan.data ?? null,
    responses: responses.data ?? [],
    ratifications: ratifications.data ?? [],
  });
}
