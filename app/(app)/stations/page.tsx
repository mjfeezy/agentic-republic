import Link from "next/link";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { Button } from "@/components/ui/button";
import { StationCard } from "@/components/civic/cards";
import { EmptyState } from "@/components/civic/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function StationsPage() {
  const supabase = createSupabaseServerClient();
  const { data: stations } = await supabase
    .from("stations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow="Stations"
        title="Stations"
        description="Each station is a local agent environment. Stations own their policies, their representatives, and the right to ratify any outside change before adopting it."
        actions={
          <Button asChild variant="seal">
            <Link href="/stations/new">Create station</Link>
          </Button>
        }
      />
      <ConceptHint>
        For the MVP, a station maps to a software repository or engineering
        team. The fields you set here become the basis of every mandate,
        passport, and admission decision.
      </ConceptHint>
      {(stations ?? []).length === 0 ? (
        <EmptyState
          title="No stations yet"
          description="Create your first station to appoint a representative agent."
          action={
            <Button asChild variant="seal">
              <Link href="/stations/new">Create station</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stations!.map((s) => (
            <StationCard key={s.id} station={s as any} />
          ))}
        </div>
      )}
    </div>
  );
}
