// Self-introspection endpoint. The MCP server calls this on startup to
// learn the calling station's name, participation_mode, and approval_status
// — used to decide which tools to expose to the agent.

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

  const station = auth.station as Record<string, unknown>;
  return NextResponse.json({
    station: {
      id: station.id,
      name: station.name,
      station_type: station.station_type,
      participation_mode: station.participation_mode ?? "both",
      approval_status: station.approval_status ?? "active",
    },
    representative: {
      id: auth.representative.id,
      name: auth.representative.name,
      visa_class: auth.representative.visa_class,
    },
  });
}
