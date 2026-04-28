import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrustScoreBadge,
  VisaBadge,
  PassportStatusBadge,
} from "@/components/civic/badges";
import { PassportCard } from "@/components/civic/passport-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAuditLogs } from "@/lib/services/audit";
import { AuditLogTable } from "@/components/civic/audit-log-table";
import { issuePassport } from "@/lib/services/passport";
import { hashMandate } from "@/lib/services/mandate";
import { logEvent } from "@/lib/services/audit";

interface Props {
  params: { representativeId: string };
}

async function issuePassportAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const repId = String(formData.get("representative_id"));
  const { data: rep } = await supabase
    .from("representatives")
    .select("*")
    .eq("id", repId)
    .maybeSingle();
  if (!rep) return;
  const { data: mandate } = await supabase
    .from("mandates")
    .select("*")
    .eq("station_id", rep.station_id)
    .eq("active", true)
    .maybeSingle();
  const mandate_hash = mandate ? hashMandate(mandate as any) : "no_mandate";
  const { data: station } = await supabase
    .from("stations")
    .select("station_type")
    .eq("id", rep.station_id)
    .maybeSingle();
  const passport = await issuePassport(supabase, {
    representative: rep as any,
    stationType: station?.station_type ?? "software_repository",
    allowedDomains: rep.domain_focus,
    mandateHash: mandate_hash,
  });
  await logEvent(supabase, {
    event_type: "passport_issued",
    station_id: rep.station_id,
    representative_id: rep.id,
    metadata: { passport_id: passport.id, mandate_hash },
  });
  revalidatePath(`/representatives/${repId}`);
}

async function revokePassportAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const passportId = String(formData.get("passport_id"));
  const repId = String(formData.get("representative_id"));
  await supabase
    .from("passports")
    .update({ revocation_status: "revoked" })
    .eq("id", passportId);
  await logEvent(supabase, {
    event_type: "passport_revoked",
    representative_id: repId,
    metadata: { passport_id: passportId },
  });
  revalidatePath(`/representatives/${repId}`);
}

export default async function RepresentativeDetailPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: rep } = await supabase
    .from("representatives")
    .select("*, station:stations(*)")
    .eq("id", params.representativeId)
    .maybeSingle();
  if (!rep) notFound();

  const [passport, packets, responses, trust, mandate] = await Promise.all([
    supabase
      .from("passports")
      .select("*")
      .eq("representative_id", rep.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("civic_packets")
      .select("id, title, status, created_at")
      .eq("representative_id", rep.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("packet_responses")
      .select("id, packet_id, response_type, summary, created_at")
      .eq("representative_id", rep.id),
    supabase.from("trust_scores").select("*").eq("representative_id", rep.id),
    supabase
      .from("mandates")
      .select("*")
      .eq("station_id", rep.station_id)
      .eq("active", true)
      .maybeSingle(),
  ]);
  const audit = await listAuditLogs(supabase, {
    representative_id: rep.id,
    limit: 50,
  });

  return (
    <div>
      <PageHeader
        eyebrow={rep.station?.name}
        title={rep.name}
        description={`Role: ${rep.role}. Domain focus: ${rep.domain_focus.join(", ")}`}
        actions={
          <div className="flex gap-2">
            <VisaBadge visa={rep.visa_class} />
            {passport.data ? (
              <PassportStatusBadge status={passport.data.revocation_status} />
            ) : (
              <Badge variant="muted">No passport</Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-base">Passport</CardTitle>
              <div className="flex gap-2">
                <form action={issuePassportAction}>
                  <input type="hidden" name="representative_id" value={rep.id} />
                  <Button type="submit" variant="outline" size="sm">
                    {passport.data ? "Reissue" : "Issue passport"}
                  </Button>
                </form>
                {passport.data?.revocation_status === "valid" ? (
                  <form action={revokePassportAction}>
                    <input type="hidden" name="passport_id" value={passport.data.id} />
                    <input type="hidden" name="representative_id" value={rep.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Revoke
                    </Button>
                  </form>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {passport.data ? (
                <PassportCard
                  passport={passport.data as any}
                  representative={rep}
                  station={rep.station}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No passport on file. Issue one to allow this representative
                  to participate at the Port of Entry.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Civic packets submitted
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(packets.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No packets submitted yet.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {packets.data!.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded border bg-card px-3 py-2"
                    >
                      <Link href={`/packets/${p.id}`} className="hover:underline">
                        {p.title}
                      </Link>
                      <Badge variant="muted" className="text-[10px]">
                        {p.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Responses given
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(responses.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No responses yet.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {responses.data!.map((r) => (
                    <li key={r.id} className="rounded border bg-card px-3 py-2">
                      <Link
                        href={`/packets/${r.packet_id}`}
                        className="hover:underline"
                      >
                        {r.summary}
                      </Link>
                      <Badge variant="seal" className="ml-2 text-[10px]">
                        {r.response_type}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Trust scores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(trust.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                trust.data!.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-mono">{t.domain}</span>
                    <TrustScoreBadge score={t.score} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Audit history
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditLogTable logs={audit.slice(0, 10)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
