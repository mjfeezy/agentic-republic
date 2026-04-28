import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultMandateBody, hashMandate } from "@/lib/services/mandate";
import { mandateUpsertSchema } from "@/lib/validators";
import { logEvent } from "@/lib/services/audit";

interface Props {
  params: { stationId: string };
}

const FIELDS: {
  name:
    | "may_observe"
    | "may_share"
    | "may_request"
    | "may_not_share"
    | "may_adopt_without_approval"
    | "requires_approval";
  label: string;
  hint: string;
}[] = [
  { name: "may_observe", label: "May observe", hint: "What signals can the representative read locally?" },
  { name: "may_share", label: "May share", hint: "What may it carry into an institution?" },
  { name: "may_request", label: "May request", hint: "What may it ask other reps for?" },
  { name: "may_not_share", label: "May NOT share", hint: "Hard prohibitions. The Port of Entry checks every packet against this list." },
  { name: "may_adopt_without_approval", label: "May adopt without approval", hint: "Auto-adopt for low-risk knowledge categories." },
  { name: "requires_approval", label: "Requires approval", hint: "Anything that hits this list routes through ratification." },
];

async function saveMandate(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const station_id = String(formData.get("station_id") ?? "");
  const parsed = mandateUpsertSchema.parse({
    station_id,
    representative_id: null,
    may_observe: parseList(formData.get("may_observe")),
    may_share: parseList(formData.get("may_share")),
    may_request: parseList(formData.get("may_request")),
    may_not_share: parseList(formData.get("may_not_share")),
    may_adopt_without_approval: parseList(
      formData.get("may_adopt_without_approval"),
    ),
    requires_approval: parseList(formData.get("requires_approval")),
  });

  // Bump version of any existing active mandate, then insert a new one
  await supabase
    .from("mandates")
    .update({ active: false })
    .eq("station_id", station_id)
    .eq("active", true);

  const { data: latestVersion } = await supabase
    .from("mandates")
    .select("version")
    .eq("station_id", station_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((latestVersion?.version as number) ?? 0) + 1;

  const { data: mandate, error } = await supabase
    .from("mandates")
    .insert({
      ...parsed,
      version,
      active: true,
    })
    .select()
    .single();
  if (error) {
    redirect(
      `/stations/${station_id}/mandate?error=${encodeURIComponent(error.message)}`,
    );
  }
  // Refresh passport mandate_hash for all reps in this station
  const newHash = hashMandate(mandate as any);
  await supabase
    .from("passports")
    .update({ mandate_hash: newHash })
    .eq("station_id", station_id)
    .eq("revocation_status", "valid");

  await logEvent(supabase, {
    event_type: "mandate_updated",
    station_id,
    metadata: { version, mandate_hash: newHash },
  });
  revalidatePath(`/stations/${station_id}`);
  redirect(`/stations/${station_id}`);
}

function parseList(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function MandateEditorPage({
  params,
  searchParams,
}: Props & { searchParams?: { error?: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: station } = await supabase
    .from("stations")
    .select("*")
    .eq("id", params.stationId)
    .maybeSingle();
  if (!station) notFound();

  const { data: mandate } = await supabase
    .from("mandates")
    .select("*")
    .eq("station_id", params.stationId)
    .eq("active", true)
    .maybeSingle();

  const def = mandate ?? { ...defaultMandateBody(), version: 0 };

  return (
    <div>
      <PageHeader
        eyebrow={station.name}
        title="Mandate editor"
        description="The mandate is the constitution for this station's representative. The Port of Entry, the ratification gate, and every audit decision rely on it."
      />
      <ConceptHint>
        One permission per line. The defaults below are the spec defaults — a
        sensible starting point. Save to bump the version; passports get the
        new mandate hash automatically.
      </ConceptHint>
      <Card className="max-w-4xl">
        <CardContent className="p-6">
          <form action={saveMandate} className="space-y-6">
            <input type="hidden" name="station_id" value={station.id} />
            <div className="grid gap-6 md:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.name} className="space-y-2">
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Textarea
                    id={f.name}
                    name={f.name}
                    rows={6}
                    defaultValue={(def as any)[f.name].join("\n")}
                  />
                  <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                </div>
              ))}
            </div>
            {searchParams?.error ? (
              <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {searchParams.error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="submit" variant="seal">
                Save mandate (v{(mandate?.version ?? 0) + 1})
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
