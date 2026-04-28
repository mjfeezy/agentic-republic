import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PacketStatusBadge, RiskBadge } from "@/components/civic/badges";
import { ResponseCard } from "@/components/civic/cards";
import {
  PortOfEntryTimeline,
  ScanResultCard,
} from "@/components/civic/port-of-entry-timeline";
import { snakeToTitle, formatDate } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAuditLogs } from "@/lib/services/audit";
import { AuditLogTable } from "@/components/civic/audit-log-table";
import { createResponse } from "@/lib/services/responses";
import { createRatificationRequest } from "@/lib/services/ratification";

interface Props {
  params: { packetId: string };
}

async function addResponseAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const packet_id = String(formData.get("packet_id"));
  await createResponse(
    supabase,
    {
      packet_id,
      representative_id: String(formData.get("representative_id")),
      response_type: String(formData.get("response_type")) as any,
      summary: String(formData.get("summary")),
      proposed_pattern: String(formData.get("proposed_pattern") || "") || null,
      evidence: {},
      risks: String(formData.get("risks") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      implementation_steps: String(formData.get("implementation_steps") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      confidence_score: Number(formData.get("confidence_score") || 0.7),
    },
    user.id,
  );
  revalidatePath(`/packets/${packet_id}`);
}

async function convertToRatificationAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const packet_id = String(formData.get("packet_id"));
  const station_id = String(formData.get("station_id"));
  const response_id = String(formData.get("response_id"));
  const title = String(formData.get("title"));
  const summary = String(formData.get("summary"));
  const proposed_change_type = String(formData.get("proposed_change_type")) as any;
  const risk_level = String(formData.get("risk_level") || "low") as any;
  const req = await createRatificationRequest(supabase, {
    station_id,
    packet_id,
    response_id,
    title,
    recommendation_summary: summary,
    proposed_change_type,
    risk_level,
    actor_user_id: user.id,
  });
  revalidatePath("/ratification");
  redirect(`/ratification/${req.id}`);
}

export default async function PacketDetailPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: packet } = await supabase
    .from("civic_packets")
    .select(
      "*, station:stations(*), committee:committees(*), institution:institutions(*), representative:representatives(*)",
    )
    .eq("id", params.packetId)
    .maybeSingle();
  if (!packet) notFound();

  const [scan, responses, reps, quarantine] = await Promise.all([
    supabase
      .from("baggage_scans")
      .select("*")
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("packet_responses")
      .select("*, representative:representatives(name)")
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: false }),
    supabase.from("representatives").select("*"),
    supabase
      .from("quarantine_cases")
      .select("*")
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const audit = await listAuditLogs(supabase, {
    packet_id: packet.id,
    limit: 30,
  });

  return (
    <div>
      <PageHeader
        eyebrow={`${packet.institution?.name ?? "Institution"} · ${packet.committee?.name ?? "Committee"}`}
        title={packet.title}
        description={packet.summary}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="seal" className="text-[10px] uppercase">
              {snakeToTitle(packet.packet_type)}
            </Badge>
            <PacketStatusBadge status={packet.status as any} />
            {scan.data ? <RiskBadge level={scan.data.risk_level as any} /> : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">Packet body</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(packet.body, null, 2)}
              </pre>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-muted-foreground">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest">
                    Originating station
                  </div>
                  <div>{packet.station?.name}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest">
                    Representative
                  </div>
                  <div>{packet.representative?.name}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest">
                    Sensitivity
                  </div>
                  <div>{packet.sensitivity}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest">
                    Created
                  </div>
                  <div>{formatDate(packet.created_at)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {scan.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Port of Entry result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="rounded border bg-accent/30 px-3 py-2 text-sm">
                  Decision: <strong>{scan.data.decision}</strong> ·{" "}
                  {scan.data.explanation}
                </p>
                <PortOfEntryTimeline
                  stages={[
                    { key: "passport", result: scan.data.passport_result as any },
                    { key: "mandate", result: scan.data.mandate_result as any },
                    { key: "visa", result: scan.data.visa_result as any },
                    { key: "baggage", result: scan.data.sensitive_data_result as any },
                    {
                      key: "injection",
                      result: scan.data.prompt_injection_result as any,
                    },
                    { key: "unsafe", result: scan.data.malware_heuristic_result as any },
                  ]}
                />
                <Link
                  href={`/port-of-entry/scans/${scan.data.id}`}
                  className="text-sm underline"
                >
                  Open full scan detail →
                </Link>
              </CardContent>
            </Card>
          ) : null}

          {quarantine.data ? (
            <Card className="border-civic-danger/40">
              <CardHeader>
                <CardTitle className="font-serif text-base text-civic-danger">
                  Quarantined
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{quarantine.data.reason}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/quarantine/${quarantine.data.id}`}>
                    Review case →
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-base">
                  Responses ({(responses.data ?? []).length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(responses.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No responses yet. Be the first.
                </p>
              ) : (
                (responses.data ?? []).map((r: any) => (
                  <div key={r.id} className="space-y-2">
                    <ResponseCard
                      response={r}
                      representativeName={r.representative?.name ?? null}
                    />
                    {packet.status === "published" ? (
                      <details className="rounded border bg-muted/30 p-3 text-sm">
                        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                          Convert to ratification request
                        </summary>
                        <form
                          action={convertToRatificationAction}
                          className="mt-3 space-y-3"
                        >
                          <input
                            type="hidden"
                            name="station_id"
                            value={packet.originating_station_id}
                          />
                          <input
                            type="hidden"
                            name="packet_id"
                            value={packet.id}
                          />
                          <input
                            type="hidden"
                            name="response_id"
                            value={r.id}
                          />
                          <div className="space-y-1">
                            <Label htmlFor={`title-${r.id}`}>Title</Label>
                            <Input
                              id={`title-${r.id}`}
                              name="title"
                              defaultValue={`Adopt: ${r.summary.slice(0, 60)}`}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Summary</Label>
                            <Textarea
                              name="summary"
                              defaultValue={r.proposed_pattern || r.summary}
                              required
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label>Proposed change type</Label>
                              <select
                                name="proposed_change_type"
                                defaultValue="agent_instruction_change"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                              >
                                {[
                                  "educational_summary",
                                  "local_memory_note",
                                  "agent_instruction_change",
                                  "tool_installation",
                                  "code_change",
                                  "destructive_action",
                                ].map((v) => (
                                  <option key={v} value={v}>
                                    {snakeToTitle(v)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label>Risk level</Label>
                              <select
                                name="risk_level"
                                defaultValue="low"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                              >
                                {["low", "medium", "high", "critical"].map(
                                  (v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                          </div>
                          <Button type="submit" variant="seal" size="sm">
                            Send to ratification
                          </Button>
                        </form>
                      </details>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {packet.status === "published" ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Add a response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={addResponseAction} className="space-y-4">
                  <input type="hidden" name="packet_id" value={packet.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Responding as</Label>
                      <select
                        name="representative_id"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="" disabled>
                          Choose representative…
                        </option>
                        {(reps.data ?? [])
                          .filter((r: any) => r.id !== packet.representative_id)
                          .map((r: any) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <select
                        name="response_type"
                        defaultValue="pattern"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {[
                          "advice",
                          "pattern",
                          "standard_suggestion",
                          "warning",
                          "clarification_question",
                          "evidence_report",
                        ].map((v) => (
                          <option key={v} value={v}>
                            {snakeToTitle(v)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Summary</Label>
                    <Textarea name="summary" rows={2} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Proposed pattern</Label>
                    <Textarea name="proposed_pattern" rows={2} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Implementation steps (one per line)</Label>
                      <Textarea name="implementation_steps" rows={3} />
                    </div>
                    <div className="space-y-1">
                      <Label>Risks (one per line)</Label>
                      <Textarea name="risks" rows={3} />
                    </div>
                  </div>
                  <div className="space-y-1 max-w-[180px]">
                    <Label>Confidence (0–1)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      defaultValue="0.7"
                      name="confidence_score"
                    />
                  </div>
                  <Button type="submit" variant="seal">
                    Post response
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Audit trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditLogTable logs={audit} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
