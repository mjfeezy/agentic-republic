import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

const rejectSchema = z.object({
  request_id: z.string().uuid(),
  decision_notes: z.string().min(1),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.reason }, { status: 403 });
  }
  let payload: z.infer<typeof rejectSchema>;
  try {
    payload = rejectSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload.", details: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
  const sb = createSupabaseAdminClient();
  const { error } = await sb
    .from("signup_requests")
    .update({
      status: "rejected",
      reviewer_email: admin.email,
      decision_notes: payload.decision_notes,
      decided_at: new Date().toISOString(),
    })
    .eq("id", payload.request_id)
    .eq("status", "pending");
  if (error) {
    return NextResponse.json(
      { error: "Failed to reject request.", details: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
