// Admin-only: approve a pending signup_request. This is the materialization
// step. After approval, the requested station has a real station row, a
// default representative + mandate + passport, and a freshly-issued API
// token. The plaintext token is returned ONCE; the admin then forwards it
// to the requester. (Email automation is a future enhancement.)

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { defaultMandateBody, hashMandate } from "@/lib/services/mandate";
import { buildPassportPayload } from "@/lib/services/passport";
import { generateToken } from "@/lib/services/api-tokens";
import { initializeTrustScores } from "@/lib/services/trust";
import { logEvent } from "@/lib/services/audit";

const approveSchema = z.object({
  request_id: z.string().uuid(),
  decision_notes: z.string().optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.reason }, { status: 403 });
  }

  let payload: z.infer<typeof approveSchema>;
  try {
    payload = approveSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid payload.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  const sb = createSupabaseAdminClient();

  // Pull the request
  const { data: request } = await sb
    .from("signup_requests")
    .select("*")
    .eq("id", payload.request_id)
    .maybeSingle();
  if (!request) {
    return NextResponse.json(
      { error: "Signup request not found." },
      { status: 404 },
    );
  }
  if (request.status !== "pending") {
    return NextResponse.json(
      { error: `Request is in '${request.status}' status; only pending requests can be approved.` },
      { status: 409 },
    );
  }

  // 1. Create the station
  const { data: station, error: stationErr } = await sb
    .from("stations")
    .insert({
      owner_user_id: null,
      name: request.station_name,
      description: request.description,
      station_type: "software_repository",
      allowed_share_categories: request.allowed_share_categories,
      prohibited_share_categories: request.prohibited_share_categories,
      participation_mode: request.participation_mode,
      approval_status: "active",
    })
    .select()
    .single();
  if (stationErr || !station) {
    return NextResponse.json(
      { error: "Failed to create station.", details: stationErr?.message },
      { status: 500 },
    );
  }

  // 2. Create representative
  const { data: rep, error: repErr } = await sb
    .from("representatives")
    .insert({
      station_id: station.id,
      name: `${request.station_name} Representative`,
      role: "station_representative",
      domain_focus: request.domain_focus,
      visa_class: "representative",
    })
    .select()
    .single();
  if (repErr || !rep) {
    return NextResponse.json(
      { error: "Failed to create representative.", details: repErr?.message },
      { status: 500 },
    );
  }
  await initializeTrustScores(sb, rep.id);

  // 3. Create mandate
  const mandateBody = defaultMandateBody();
  const { data: mandate, error: mandateErr } = await sb
    .from("mandates")
    .insert({
      station_id: station.id,
      representative_id: rep.id,
      version: 1,
      active: true,
      ...mandateBody,
    })
    .select()
    .single();
  if (mandateErr || !mandate) {
    return NextResponse.json(
      { error: "Failed to create mandate.", details: mandateErr?.message },
      { status: 500 },
    );
  }

  // 4. Issue passport
  const passportPayload = buildPassportPayload({
    representative: rep as any,
    stationType: "software_repository",
    allowedDomains: request.domain_focus,
    mandateHash: hashMandate(mandate as any),
  });
  const { data: passport, error: passportErr } = await sb
    .from("passports")
    .insert(passportPayload)
    .select()
    .single();
  if (passportErr || !passport) {
    return NextResponse.json(
      { error: "Failed to issue passport.", details: passportErr?.message },
      { status: 500 },
    );
  }

  // 5. Issue API token
  const slug = request.station_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const token = generateToken(slug);
  const { error: tokErr } = await sb.from("api_tokens").insert({
    name: `${request.station_name} initial token`,
    token_hash: token.hash,
    station_id: station.id,
    representative_id: rep.id,
  });
  if (tokErr) {
    return NextResponse.json(
      { error: "Failed to issue token.", details: tokErr.message },
      { status: 500 },
    );
  }

  // 6. Mark the signup request as approved
  await sb
    .from("signup_requests")
    .update({
      status: "approved",
      reviewer_email: admin.email,
      decision_notes: payload.decision_notes ?? null,
      decided_at: new Date().toISOString(),
      created_station_id: station.id,
    })
    .eq("id", request.id);

  // 7. Audit
  await logEvent(sb, {
    event_type: "station_created",
    actor_user_id: admin.userId,
    station_id: station.id,
    metadata: {
      via: "signup_approval",
      contact_email: request.contact_email,
      participation_mode: request.participation_mode,
    },
  });

  return NextResponse.json({
    ok: true,
    station_id: station.id,
    representative_id: rep.id,
    passport_id: passport.id,
    contact_email: request.contact_email,
    token: token.plaintext,
    notice:
      "Token shown ONCE. Send it to the contact email. To rotate later, issue a new token via the admin UI.",
  });
}
