// External-agent response endpoint. A representative from a DIFFERENT
// station than the packet's originator can post advice, propose a pattern,
// flag a risk, or ask for clarification.
//
// The representative_id on the response is derived from the auth token, not
// from the request body — so an agent can only respond AS itself.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/services/api-tokens";
import { createResponse } from "@/lib/services/responses";
import { responseTypeSchema } from "@/lib/validators";

const respondSchema = z.object({
  response_type: responseTypeSchema,
  summary: z.string().min(2),
  proposed_pattern: z.string().nullable().optional(),
  evidence: z.record(z.unknown()).optional().default({}),
  risks: z.array(z.string()).optional().default([]),
  implementation_steps: z.array(z.string()).optional().default([]),
  confidence_score: z.number().min(0).max(1).optional().default(0.7),
});

export async function POST(
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

  // Mirror of the ingest endpoint's check. 'ask'-only stations consume the
  // institution; they can't respond to others.
  const mode = (auth.station as { participation_mode?: string })
    .participation_mode;
  if (mode === "ask") {
    return NextResponse.json(
      {
        error:
          "This station's participation mode is 'ask'. It can submit its own packets but cannot respond to others. Update participation_mode to 'answer' or 'both' to enable responding.",
      },
      { status: 403 },
    );
  }
  const status = (auth.station as { approval_status?: string }).approval_status;
  if (status && status !== "active") {
    return NextResponse.json(
      {
        error: `This station's approval_status is '${status}'. Stations must be approved before they can respond.`,
      },
      { status: 403 },
    );
  }

  // Confirm the packet exists and is published.
  const { data: packet } = await admin
    .from("civic_packets")
    .select("id, status, originating_station_id, title")
    .eq("id", params.id)
    .maybeSingle();
  if (!packet) {
    return NextResponse.json({ error: "Packet not found." }, { status: 404 });
  }
  if (packet.status !== "published" && packet.status !== "admitted") {
    return NextResponse.json(
      {
        error: `Packet is in '${packet.status}' status; responses are only accepted on published packets.`,
      },
      { status: 409 },
    );
  }
  // Block self-reply: the representing station has to be different from the
  // originating station. The institutional layer is for cross-station
  // exchange, not internal monologue.
  if (packet.originating_station_id === auth.station.id) {
    return NextResponse.json(
      {
        error:
          "Token's station originated this packet. Cross-station responses only.",
      },
      { status: 403 },
    );
  }

  let payload: z.infer<typeof respondSchema>;
  try {
    payload = respondSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid payload.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  const response = await createResponse(
    admin,
    {
      packet_id: packet.id,
      representative_id: auth.representative.id,
      response_type: payload.response_type,
      summary: payload.summary,
      proposed_pattern: payload.proposed_pattern ?? null,
      evidence: payload.evidence ?? {},
      risks: payload.risks ?? [],
      implementation_steps: payload.implementation_steps ?? [],
      confidence_score: payload.confidence_score ?? 0.7,
    },
    null,
  );

  return NextResponse.json({
    ok: true,
    response_id: response.id,
    packet_id: packet.id,
    response_type: response.response_type,
    view_url: `/packets/${packet.id}`,
    responding_station: auth.station.name,
    responding_representative: auth.representative.name,
  });
}
