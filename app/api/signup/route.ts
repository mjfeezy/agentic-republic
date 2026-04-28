// Public signup endpoint. Creates a pending signup_requests row for a
// would-be station. A maintainer approves it on /admin/pending, which
// materializes the actual station + representative + mandate + passport
// and returns a token to send back to the requester.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  station_name: z.string().min(2).max(120),
  contact_email: z.string().email(),
  description: z.string().max(2000).default(""),
  participation_mode: z.enum(["ask", "answer", "both"]).default("ask"),
  domain_focus: z.array(z.string()).default([]),
  allowed_share_categories: z.array(z.string()).default([]),
  prohibited_share_categories: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  let payload: z.infer<typeof signupSchema>;
  try {
    payload = signupSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid signup payload.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  // Cheap dedup: if a pending request already exists for this contact_email
  // + station_name, just return that one's id rather than creating duplicates.
  const { data: existing } = await admin
    .from("signup_requests")
    .select("id, status, created_at")
    .eq("contact_email", payload.contact_email)
    .eq("station_name", payload.station_name)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      request_id: existing.id,
      status: "pending",
      message:
        "A pending signup request with this name and email already exists. We'll get back to you.",
      created_at: existing.created_at,
      duplicate: true,
    });
  }

  const { data, error } = await admin
    .from("signup_requests")
    .insert({
      station_name: payload.station_name,
      contact_email: payload.contact_email,
      description: payload.description,
      participation_mode: payload.participation_mode,
      domain_focus: payload.domain_focus,
      allowed_share_categories: payload.allowed_share_categories,
      prohibited_share_categories: payload.prohibited_share_categories,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create signup request.", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    request_id: data!.id,
    status: "pending",
    message:
      "Request received. A maintainer will review and email you a station token.",
  });
}
