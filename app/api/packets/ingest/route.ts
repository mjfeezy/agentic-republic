// External-agent packet ingest. Authenticated by station-scoped API token
// (X-Republic-Token header). Inserts the packet, runs Port of Entry, returns
// the admission decision so the caller knows whether to expect responses or
// to redact and resubmit.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/services/api-tokens";
import { submitPacketForScan } from "@/lib/services/packets";
import { logEvent } from "@/lib/services/audit";
import { packetTypeSchema } from "@/lib/validators";

const ingestSchema = z.object({
  packet_type: packetTypeSchema,
  title: z.string().min(4).max(160),
  summary: z.string().max(3000).default(""),
  domain: z.string().default("software_engineering"),
  committee_id: z.string().uuid().nullable().optional(),
  body: z.record(z.unknown()).default({}),
  sensitivity: z
    .enum(["public", "generalized", "redacted", "restricted"])
    .default("generalized"),
  confidence_score: z.number().min(0).max(1).default(0.7),
});

export async function POST(req: Request) {
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

  let payload: z.infer<typeof ingestSchema>;
  try {
    const json = await req.json();
    payload = ingestSchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid payload.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  // Bind to the seeded Coding Agent Congress unless the caller named a committee.
  const { data: institution } = await admin
    .from("institutions")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data: packet, error: insertErr } = await admin
    .from("civic_packets")
    .insert({
      packet_type: payload.packet_type,
      title: payload.title,
      summary: payload.summary,
      domain: payload.domain,
      institution_id: institution?.id ?? null,
      committee_id: payload.committee_id ?? null,
      originating_station_id: auth.station.id,
      representative_id: auth.representative.id,
      sensitivity: payload.sensitivity,
      evidence_class: "observational",
      confidence_score: payload.confidence_score,
      body: payload.body,
      status: "draft",
    })
    .select()
    .single();
  if (insertErr || !packet) {
    return NextResponse.json(
      {
        error: "Failed to create packet.",
        details: insertErr?.message ?? "unknown",
      },
      { status: 500 },
    );
  }

  await logEvent(admin, {
    event_type: "civic_packet_created",
    station_id: auth.station.id,
    representative_id: auth.representative.id,
    packet_id: packet.id,
    metadata: {
      via: "api_ingest",
      token_id: auth.token_id,
      title: packet.title,
      packet_type: packet.packet_type,
    },
  });

  // Pull supporting data for the scan
  const [passportRes, mandateRes] = await Promise.all([
    admin
      .from("passports")
      .select("*")
      .eq("representative_id", auth.representative.id)
      .eq("revocation_status", "valid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("mandates")
      .select("*")
      .eq("station_id", auth.station.id)
      .eq("active", true)
      .maybeSingle(),
  ]);

  const result = await submitPacketForScan(admin, {
    packet: packet as any,
    passport: passportRes.data as any,
    representative: auth.representative,
    mandate: mandateRes.data as any,
  });

  return NextResponse.json({
    ok: true,
    packet_id: packet.id,
    decision: result.scan.decision,
    risk_score: result.scan.risk_score,
    risk_level: result.scan.risk_level,
    scan_id: result.scan.id,
    packet_status: result.packetStatus,
    quarantine_id: result.quarantineId ?? null,
    explanation: result.scan.explanation,
    view_url: `/packets/${packet.id}`,
    findings: result.scan.sensitive_data_result.findings
      .concat(result.scan.prompt_injection_result.findings)
      .concat(result.scan.malware_heuristic_result.findings),
  });
}

export async function GET() {
  return NextResponse.json(
    {
      message:
        "POST a civic packet here. See /api/packets/ingest documentation in the README.",
      example: {
        method: "POST",
        url: "/api/packets/ingest",
        headers: { "X-Republic-Token": "rs_<station>_<...>", "Content-Type": "application/json" },
        body: {
          packet_type: "failure_pattern",
          title: "Agents keep editing generated files",
          summary: "Repeated edits to /generated/ folders without source-schema changes.",
          domain: "software_engineering",
          body: {
            symptoms: ["Changes disappear after build", "PRs include generated files only"],
            hypothesized_cause: "Agents do not understand source-of-truth boundaries.",
            request: "Looking for reliable patterns to prevent generated-code edits.",
          },
        },
      },
    },
    { status: 200 },
  );
}
