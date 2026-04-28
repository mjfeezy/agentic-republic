import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PortOfEntryTimeline,
  ScanResultCard,
} from "@/components/civic/port-of-entry-timeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  releaseQuarantine,
  rejectQuarantine,
  setUnderReview,
} from "@/lib/services/quarantine";

interface Props {
  params: { caseId: string };
}

async function releaseAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await releaseQuarantine(supabase, {
    case_id: String(formData.get("case_id")),
    reviewer_id: user?.id ?? null,
    notes: String(formData.get("notes") || ""),
  });
  revalidatePath(`/quarantine/${formData.get("case_id")}`);
  redirect("/quarantine");
}

async function rejectAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await rejectQuarantine(supabase, {
    case_id: String(formData.get("case_id")),
    reviewer_id: user?.id ?? null,
    notes: String(formData.get("notes") || ""),
  });
  revalidatePath(`/quarantine/${formData.get("case_id")}`);
  redirect("/quarantine");
}

async function reviewAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await setUnderReview(supabase, {
    case_id: String(formData.get("case_id")),
    reviewer_id: user?.id ?? null,
  });
  revalidatePath(`/quarantine/${formData.get("case_id")}`);
}

export default async function QuarantineDetailPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: case_ } = await supabase
    .from("quarantine_cases")
    .select(
      "*, packet:civic_packets(*, station:stations(name)), scan:baggage_scans(*)",
    )
    .eq("id", params.caseId)
    .maybeSingle();
  if (!case_) notFound();

  return (
    <div>
      <PageHeader
        eyebrow={`Quarantine · ${case_.status}`}
        title={case_.packet?.title ?? "Quarantined packet"}
        description={case_.reason}
        actions={
          <div className="flex gap-2">
            {case_.status === "open" ? (
              <form action={reviewAction}>
                <input type="hidden" name="case_id" value={case_.id} />
                <Button type="submit" variant="outline">
                  Mark under review
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {case_.scan ? (
            <>
              <PortOfEntryTimeline
                stages={[
                  { key: "passport", result: case_.scan.passport_result as any },
                  { key: "mandate", result: case_.scan.mandate_result as any },
                  { key: "visa", result: case_.scan.visa_result as any },
                  {
                    key: "baggage",
                    result: case_.scan.sensitive_data_result as any,
                  },
                  {
                    key: "injection",
                    result: case_.scan.prompt_injection_result as any,
                  },
                  {
                    key: "unsafe",
                    result: case_.scan.malware_heuristic_result as any,
                  },
                ]}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <ScanResultCard
                  title="Sensitive data"
                  result={case_.scan.sensitive_data_result as any}
                />
                <ScanResultCard
                  title="Prompt injection"
                  result={case_.scan.prompt_injection_result as any}
                />
                <ScanResultCard
                  title="Unsafe code"
                  result={case_.scan.malware_heuristic_result as any}
                />
                <ScanResultCard
                  title="Mandate"
                  result={case_.scan.mandate_result as any}
                />
              </div>
            </>
          ) : null}

          {case_.packet ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Packet body
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(case_.packet.body, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Badge variant="danger">{case_.status}</Badge>
              {case_.resolution ? (
                <p className="text-xs text-muted-foreground">{case_.resolution}</p>
              ) : null}
            </CardContent>
          </Card>

          {case_.status !== "released" && case_.status !== "rejected" ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">Resolve</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={releaseAction} className="space-y-2">
                  <input type="hidden" name="case_id" value={case_.id} />
                  <Label className="text-xs">Release notes</Label>
                  <Textarea
                    name="notes"
                    rows={2}
                    placeholder="What was redacted?"
                  />
                  <Button type="submit" variant="seal" className="w-full">
                    Release & publish
                  </Button>
                </form>
                <form action={rejectAction} className="space-y-2">
                  <input type="hidden" name="case_id" value={case_.id} />
                  <Label className="text-xs">Rejection notes</Label>
                  <Textarea name="notes" rows={2} />
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                  >
                    Reject permanently
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
