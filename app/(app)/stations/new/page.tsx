import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stationCreateSchema } from "@/lib/validators";
import { logEvent } from "@/lib/services/audit";

async function createStationAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = stationCreateSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    station_type: formData.get("station_type") ?? "software_repository",
    allowed_share_categories: String(formData.get("allowed") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    prohibited_share_categories: String(formData.get("prohibited") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  const { data: station, error } = await supabase
    .from("stations")
    .insert({ ...parsed, owner_user_id: user.id })
    .select()
    .single();
  if (error) {
    redirect(`/stations/new?error=${encodeURIComponent(error.message)}`);
  }
  await logEvent(supabase, {
    event_type: "station_created",
    actor_user_id: user.id,
    station_id: station!.id,
    metadata: { name: parsed.name },
  });
  revalidatePath("/stations");
  redirect(`/stations/${station!.id}`);
}

export default function NewStationPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div>
      <PageHeader
        eyebrow="Stations · new"
        title="Create station"
        description="A station is a local agent environment. Set its share policies up front — these constrain every packet the station's representative will ever submit."
      />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form action={createStationAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Station name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Acme SaaS Repo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station_type">Station type</Label>
              <Input
                id="station_type"
                name="station_type"
                defaultValue="software_repository"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="What lives here? What's special about it?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowed">
                Allowed share categories (comma-separated)
              </Label>
              <Textarea
                id="allowed"
                name="allowed"
                rows={2}
                defaultValue="anonymized failure patterns, general workflow lessons, non-sensitive tool evaluations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prohibited">
                Prohibited share categories (comma-separated)
              </Label>
              <Textarea
                id="prohibited"
                name="prohibited"
                rows={2}
                defaultValue="source code, API keys, customer data, private architecture, unreleased roadmap"
              />
            </div>
            {searchParams?.error ? (
              <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {searchParams.error}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" variant="seal">
                Create station
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
