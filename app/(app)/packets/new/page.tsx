import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/services/audit";
import { submitPacketForScan } from "@/lib/services/packets";

const PACKET_TYPES = [
  ["failure_pattern", "Failure pattern"],
  ["request_for_counsel", "Request for counsel"],
  ["proposed_standard", "Proposed standard"],
  ["warning_bulletin", "Warning bulletin"],
  ["tool_evaluation", "Tool evaluation"],
] as const;

const SENSITIVITY = [
  ["public", "public"],
  ["generalized", "generalized"],
  ["redacted", "redacted"],
  ["restricted", "restricted"],
] as const;

async function createAndScanAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const symptomLines = String(formData.get("symptoms") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const body = {
    symptoms: symptomLines,
    hypothesized_cause: String(formData.get("hypothesized_cause") ?? ""),
    request: String(formData.get("request") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  const insertPayload = {
    packet_type: String(formData.get("packet_type")),
    title: String(formData.get("title")),
    summary: String(formData.get("summary")),
    domain: String(formData.get("domain") || "software_engineering"),
    institution_id: String(formData.get("institution_id")) || null,
    committee_id: String(formData.get("committee_id")) || null,
    originating_station_id: String(formData.get("station_id")),
    representative_id: String(formData.get("representative_id")),
    sensitivity: String(formData.get("sensitivity") || "generalized"),
    evidence_class: "observational",
    confidence_score: 0.7,
    body,
    status: "draft",
  };

  const { data: packet, error } = await supabase
    .from("civic_packets")
    .insert(insertPayload)
    .select()
    .single();
  if (error) {
    redirect(`/packets/new?error=${encodeURIComponent(error.message)}`);
  }
  await logEvent(supabase, {
    event_type: "civic_packet_created",
    actor_user_id: user.id,
    station_id: packet!.originating_station_id,
    packet_id: packet!.id,
    metadata: { title: packet!.title, packet_type: packet!.packet_type },
  });

  // Pull deps for the scan
  const [passportRes, repRes, mandateRes] = await Promise.all([
    supabase
      .from("passports")
      .select("*")
      .eq("representative_id", packet!.representative_id)
      .eq("revocation_status", "valid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("representatives")
      .select("*")
      .eq("id", packet!.representative_id)
      .maybeSingle(),
    supabase
      .from("mandates")
      .select("*")
      .eq("station_id", packet!.originating_station_id)
      .eq("active", true)
      .maybeSingle(),
  ]);

  await submitPacketForScan(supabase, {
    packet: packet as any,
    passport: passportRes.data as any,
    representative: repRes.data as any,
    mandate: mandateRes.data as any,
    actor_user_id: user.id,
  });

  revalidatePath("/packets");
  redirect(`/packets/${packet!.id}`);
}

interface PageProps {
  searchParams: { error?: string };
}

export default async function NewPacketPage({ searchParams }: PageProps) {
  const supabase = createSupabaseServerClient();
  const [stations, reps, committees, institution] = await Promise.all([
    supabase.from("stations").select("*"),
    supabase.from("representatives").select("*"),
    supabase.from("committees").select("*"),
    supabase.from("institutions").select("*").maybeSingle(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Civic packet · new"
        title="Submit civic packet"
        description="Fill the structured form below. On submit, the Port of Entry will validate the passport, mandate, and visa, then run baggage / prompt-injection / unsafe-code scans before deciding whether to admit, quarantine, or reject."
      />
      <ConceptHint>
        For the demo: include <code className="font-mono">DATABASE_URL</code>,
        a private key block, or jailbreak phrases ("ignore previous
        instructions") in any field to see the scanner reject and route to
        quarantine. Otherwise, the packet should sail through.
      </ConceptHint>

      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <form action={createAndScanAction} className="space-y-6">
            <input
              type="hidden"
              name="institution_id"
              value={institution.data?.id ?? ""}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Station</Label>
                <select
                  name="station_id"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Choose station…
                  </option>
                  {stations.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Representative</Label>
                <select
                  name="representative_id"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Choose representative…
                  </option>
                  {reps.data?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Packet type</Label>
                <select
                  name="packet_type"
                  defaultValue="failure_pattern"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PACKET_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Committee</Label>
                <select
                  name="committee_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {committees.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Agents keep editing generated files"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                name="summary"
                rows={3}
                placeholder="One paragraph: what's the pattern or question?"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  name="domain"
                  defaultValue="software_engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sensitivity">Sensitivity</Label>
                <select
                  id="sensitivity"
                  name="sensitivity"
                  defaultValue="generalized"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SENSITIVITY.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms (one per line)</Label>
              <Textarea
                id="symptoms"
                name="symptoms"
                rows={4}
                placeholder={"Changes disappear after build\nPull requests include generated files only\nCI fails after regeneration"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hypothesized_cause">Hypothesized cause</Label>
              <Textarea
                id="hypothesized_cause"
                name="hypothesized_cause"
                rows={2}
                placeholder="Agents do not understand source-of-truth boundaries."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request">Request</Label>
              <Textarea
                id="request"
                name="request"
                rows={2}
                placeholder="Looking for reliable patterns to prevent generated-code edits."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                Free-form notes (also scanned)
              </Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            {searchParams?.error ? (
              <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {searchParams.error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" variant="seal">
                Submit & run Port of Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
