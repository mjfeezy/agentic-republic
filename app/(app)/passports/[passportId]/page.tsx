import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PassportCard } from "@/components/civic/passport-card";
import { validatePassport } from "@/lib/scanners";
import { ScanResultCard } from "@/components/civic/port-of-entry-timeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/services/audit";

async function revokeAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const id = String(formData.get("id"));
  await supabase
    .from("passports")
    .update({ revocation_status: "revoked" })
    .eq("id", id);
  await logEvent(supabase, {
    event_type: "passport_revoked",
    metadata: { passport_id: id },
  });
  revalidatePath(`/passports/${id}`);
}

export default async function PassportDetailPage({
  params,
}: {
  params: { passportId: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: passport } = await supabase
    .from("passports")
    .select("*, representative:representatives(*), station:stations(*)")
    .eq("id", params.passportId)
    .maybeSingle();
  if (!passport) notFound();

  const validation = validatePassport({
    passport: passport as any,
    representative: passport.representative as any,
    expectedStationId: passport.station_id,
    packetDomain: "",
  });

  return (
    <div>
      <PageHeader
        eyebrow={passport.station?.name}
        title={`Passport ${passport.id.slice(0, 8)}…`}
        description={`Issued by ${passport.issuer}.`}
        actions={
          passport.revocation_status === "valid" ? (
            <form action={revokeAction}>
              <input type="hidden" name="id" value={passport.id} />
              <Button type="submit" variant="destructive">
                Revoke passport
              </Button>
            </form>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PassportCard
            passport={passport as any}
            representative={passport.representative}
            station={passport.station}
          />
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Raw passport (JSON)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(passport, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
        <div>
          <ScanResultCard title="Validation" result={validation} />
        </div>
      </div>
    </div>
  );
}
