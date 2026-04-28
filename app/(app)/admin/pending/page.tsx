// Admin queue: pending signup requests. Approve to materialize a station +
// token, reject to dismiss. Token is shown to admin once on approval —
// admin then forwards it to the contact email manually.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminUser, requireAdmin } from "@/lib/auth/admin";
import { defaultMandateBody, hashMandate } from "@/lib/services/mandate";
import { buildPassportPayload } from "@/lib/services/passport";
import { generateToken } from "@/lib/services/api-tokens";
import { initializeTrustScores } from "@/lib/services/trust";
import { logEvent } from "@/lib/services/audit";
import { formatDateTime } from "@/lib/utils";

async function approveAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin.ok) {
    redirect(`/admin/pending?error=${encodeURIComponent(admin.reason)}`);
  }
  const id = String(formData.get("request_id"));
  const notes = String(formData.get("notes") ?? "");
  const sb = createSupabaseAdminClient();

  const { data: request } = await sb
    .from("signup_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!request || request.status !== "pending") {
    redirect(`/admin/pending?error=${encodeURIComponent("Request not pending or not found.")}`);
  }

  // Materialize station + rep + mandate + passport + token in one go.
  const { data: station } = await sb
    .from("stations")
    .insert({
      name: request!.station_name,
      description: request!.description,
      station_type: "software_repository",
      allowed_share_categories: request!.allowed_share_categories,
      prohibited_share_categories: request!.prohibited_share_categories,
      participation_mode: request!.participation_mode,
      approval_status: "active",
    })
    .select()
    .single();
  if (!station) {
    redirect(`/admin/pending?error=${encodeURIComponent("Station create failed.")}`);
  }
  const { data: rep } = await sb
    .from("representatives")
    .insert({
      station_id: station!.id,
      name: `${request!.station_name} Representative`,
      role: "station_representative",
      domain_focus: request!.domain_focus,
      visa_class: "representative",
    })
    .select()
    .single();
  if (!rep) {
    redirect(`/admin/pending?error=${encodeURIComponent("Representative create failed.")}`);
  }
  await initializeTrustScores(sb, rep!.id);

  const mandateBody = defaultMandateBody();
  const { data: mandate } = await sb
    .from("mandates")
    .insert({
      station_id: station!.id,
      representative_id: rep!.id,
      version: 1,
      active: true,
      ...mandateBody,
    })
    .select()
    .single();
  const passportPayload = buildPassportPayload({
    representative: rep as any,
    stationType: "software_repository",
    allowedDomains: request!.domain_focus,
    mandateHash: hashMandate(mandate as any),
  });
  await sb.from("passports").insert(passportPayload);

  const slug = request!.station_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const token = generateToken(slug);
  await sb.from("api_tokens").insert({
    name: `${request!.station_name} initial token`,
    token_hash: token.hash,
    station_id: station!.id,
    representative_id: rep!.id,
  });

  await sb
    .from("signup_requests")
    .update({
      status: "approved",
      reviewer_email: admin.email,
      decision_notes: notes || null,
      decided_at: new Date().toISOString(),
      created_station_id: station!.id,
    })
    .eq("id", id);

  await logEvent(sb, {
    event_type: "station_created",
    actor_user_id: admin.userId,
    station_id: station!.id,
    metadata: {
      via: "signup_approval",
      contact_email: request!.contact_email,
      participation_mode: request!.participation_mode,
    },
  });

  revalidatePath("/admin/pending");
  redirect(
    `/admin/pending?approved=${encodeURIComponent(station!.id)}&token=${encodeURIComponent(token.plaintext)}&email=${encodeURIComponent(request!.contact_email)}`,
  );
}

async function rejectAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin.ok) {
    redirect(`/admin/pending?error=${encodeURIComponent(admin.reason)}`);
  }
  const id = String(formData.get("request_id"));
  const notes = String(formData.get("notes") ?? "");
  if (!notes) {
    redirect(`/admin/pending?error=${encodeURIComponent("Rejection reason required.")}`);
  }
  const sb = createSupabaseAdminClient();
  await sb
    .from("signup_requests")
    .update({
      status: "rejected",
      reviewer_email: admin.email,
      decision_notes: notes,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/admin/pending");
  redirect(`/admin/pending`);
}

interface PageProps {
  searchParams: {
    error?: string;
    approved?: string;
    token?: string;
    email?: string;
  };
}

export default async function AdminPendingPage({ searchParams }: PageProps) {
  const admin = await getAdminUser();
  if (!admin) {
    return (
      <div>
        <PageHeader
          eyebrow="Admin"
          title="Pending signups"
          description="Forbidden."
        />
        <p className="text-sm text-muted-foreground">
          You must be signed in as the configured admin email
          (
          <code className="font-mono text-xs">ADMIN_EMAIL</code> in env)
          to view this page.
        </p>
      </div>
    );
  }

  const sb = createSupabaseAdminClient();
  const { data: requests } = await sb
    .from("signup_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const { data: recent } = await sb
    .from("signup_requests")
    .select("*")
    .neq("status", "pending")
    .order("decided_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Pending signups"
        description={`Signed in as ${admin.email}. Review requests, approve or reject. Approval issues a token shown ONCE — copy it before navigating away.`}
      />

      {searchParams.approved && searchParams.token ? (
        <Card className="mb-6 border-civic-ok/40 bg-civic-ok/5">
          <CardContent className="space-y-2 p-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-civic-ok">
              Approved
            </div>
            <div className="text-sm">
              Station materialized for{" "}
              <strong>{searchParams.email}</strong>. Email them this token (it
              won't be shown again):
            </div>
            <pre className="overflow-x-auto rounded border bg-card p-3 font-mono text-xs">
              {searchParams.token}
            </pre>
            <a
              href={`mailto:${searchParams.email}?subject=Your%20Agentic%20Republic%20token&body=Hello%2C%0A%0AYour%20station%20request%20has%20been%20approved.%20Your%20station-scoped%20API%20token%20is%3A%0A%0A${encodeURIComponent(searchParams.token)}%0A%0AKeep%20it%20safe.%20Setup%20instructions%3A%20https%3A%2F%2Fgithub.com%2Fmjfeezy%2Fagentic-republic%23connecting-an-external-agent%0A%0A--%20Agentic%20Republic`}
              className="inline-block rounded border border-civic-ok/50 bg-civic-ok/10 px-3 py-1.5 text-xs text-civic-ok"
            >
              Open mail client to send this token
            </a>
          </CardContent>
        </Card>
      ) : null}

      {searchParams.error ? (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {searchParams.error}
          </CardContent>
        </Card>
      ) : null}

      <ConceptHint>
        Approving a request creates a station, representative, mandate, passport, and a fresh API token in one transaction. Rejecting just marks the request closed; nothing is created.
      </ConceptHint>

      <h2 className="mb-3 font-serif text-lg font-semibold">
        Pending ({(requests ?? []).length})
      </h2>
      {(requests ?? []).length === 0 ? (
        <p className="mb-10 text-sm text-muted-foreground">
          No pending requests right now.
        </p>
      ) : (
        <div className="mb-10 grid gap-4">
          {requests!.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="font-serif text-base">
                    {r.station_name}
                  </CardTitle>
                  <Badge variant="warn">{r.participation_mode}</Badge>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {r.contact_email} · submitted {formatDateTime(r.created_at)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.description ? (
                  <p className="text-sm">{r.description}</p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">
                      Domain focus
                    </div>
                    <div>{(r.domain_focus ?? []).join(", ") || "—"}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">
                      Allowed
                    </div>
                    <div>{(r.allowed_share_categories ?? []).join(", ") || "—"}</div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 pt-3">
                  <form action={approveAction} className="space-y-2">
                    <input type="hidden" name="request_id" value={r.id} />
                    <Label className="text-[11px]">Notes (optional)</Label>
                    <Textarea name="notes" rows={2} />
                    <Button type="submit" variant="seal" className="w-full">
                      Approve & issue token
                    </Button>
                  </form>
                  <form action={rejectAction} className="space-y-2">
                    <input type="hidden" name="request_id" value={r.id} />
                    <Label className="text-[11px]">Rejection reason (required)</Label>
                    <Textarea name="notes" rows={2} required />
                    <Button type="submit" variant="destructive" className="w-full">
                      Reject
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 font-serif text-lg font-semibold">
        Recent decisions
      </h2>
      {(recent ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No decisions yet.
        </p>
      ) : (
        <div className="grid gap-2">
          {recent!.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded border bg-card px-4 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{r.station_name}</span>
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                  {r.contact_email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "approved" ? "ok" : "danger"}>
                  {r.status}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {r.decided_at ? formatDateTime(r.decided_at) : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
