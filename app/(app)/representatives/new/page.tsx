import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { representativeCreateSchema } from "@/lib/validators";
import { logEvent } from "@/lib/services/audit";
import { initializeTrustScores } from "@/lib/services/trust";

async function createRepresentativeAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const parsed = representativeCreateSchema.parse({
    station_id: formData.get("station_id"),
    name: formData.get("name"),
    role: formData.get("role") || "station_representative",
    visa_class: (formData.get("visa_class") as string) || "representative",
    domain_focus: String(formData.get("domain_focus") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  const { data: rep, error } = await supabase
    .from("representatives")
    .insert(parsed)
    .select()
    .single();
  if (error) redirect(`/representatives/new?error=${encodeURIComponent(error.message)}`);
  await initializeTrustScores(supabase, rep!.id);
  await logEvent(supabase, {
    event_type: "representative_created",
    actor_user_id: user.id,
    station_id: parsed.station_id,
    representative_id: rep!.id,
    metadata: { name: parsed.name, visa_class: parsed.visa_class },
  });
  revalidatePath("/representatives");
  redirect(`/representatives/${rep!.id}`);
}

export default async function NewRepresentativePage({
  searchParams,
}: {
  searchParams: { stationId?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: stations } = await supabase.from("stations").select("id, name");
  return (
    <div>
      <PageHeader
        eyebrow="Representatives · new"
        title="Appoint representative agent"
        description="Bind a representative to a station, give it a domain focus, and pick a visa class. You can issue a passport on the next screen."
      />
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <form action={createRepresentativeAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="station_id">Station</Label>
              <select
                id="station_id"
                name="station_id"
                required
                defaultValue={searchParams?.stationId ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select a station…
                </option>
                {stations?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Acme Repo Representative" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" name="role" defaultValue="station_representative" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visa_class">Visa class</Label>
                <select
                  id="visa_class"
                  name="visa_class"
                  defaultValue="representative"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {["visitor", "representative", "committee", "consortium", "diplomatic"].map(
                    (v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain_focus">Domain focus (comma-separated)</Label>
              <Input
                id="domain_focus"
                name="domain_focus"
                defaultValue="software_engineering, agent_security"
              />
            </div>
            {searchParams?.error ? (
              <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {searchParams.error}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" variant="seal">
                Appoint representative
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
