import Link from "next/link";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { Button } from "@/components/ui/button";
import { RepresentativeCard } from "@/components/civic/cards";
import { EmptyState } from "@/components/civic/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RepresentativesPage() {
  const supabase = createSupabaseServerClient();
  const { data: reps } = await supabase
    .from("representatives")
    .select("*, station:stations(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow="Representatives"
        title="Representative agents"
        description="A representative is a persistent delegate authorized to represent a station inside an institution. Each one carries a passport and operates within a mandate."
      />
      <ConceptHint>
        Representatives are appointed, not autonomous. The mandate determines
        what they may carry into an institution. The passport proves who they
        are at the Port of Entry.
      </ConceptHint>
      {(reps ?? []).length === 0 ? (
        <EmptyState
          title="No representatives appointed"
          description="Open a station and click 'Appoint representative' to create one."
          action={
            <Button asChild variant="seal">
              <Link href="/stations">Open stations</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reps!.map((r: any) => (
            <RepresentativeCard
              key={r.id}
              representative={r}
              station={r.station}
            />
          ))}
        </div>
      )}
    </div>
  );
}
