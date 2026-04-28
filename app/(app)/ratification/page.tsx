import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { RatificationRequestCard } from "@/components/civic/cards";
import { EmptyState } from "@/components/civic/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RatificationPage() {
  const supabase = createSupabaseServerClient();
  const { data: requests } = await supabase
    .from("ratification_requests")
    .select("*, station:stations(name)")
    .order("created_at", { ascending: false });

  const pending = (requests ?? []).filter((r: any) => r.status === "pending");
  const decided = (requests ?? []).filter((r: any) => r.status !== "pending");

  return (
    <div>
      <PageHeader
        eyebrow="Ratification"
        title="Ratification gate"
        description="Outside recommendations don't auto-apply. Each one routes back to its originating station for explicit approval before becoming policy, instruction, or memory."
      />
      <ConceptHint>
        Approval rules vary by proposed change type. Educational summaries
        auto-approve. Code changes and tool installs require explicit human
        sign-off. Destructive actions require a second review.
      </ConceptHint>

      <h2 className="mb-3 font-serif text-lg font-semibold">Pending</h2>
      {pending.length === 0 ? (
        <EmptyState
          title="No pending ratifications"
          description="Convert a packet response into a ratification request to populate this list."
          className="mb-10"
        />
      ) : (
        <div className="mb-10 grid gap-3 md:grid-cols-2">
          {pending.map((r: any) => (
            <RatificationRequestCard key={r.id} request={r} station={r.station} />
          ))}
        </div>
      )}

      <h2 className="mb-3 font-serif text-lg font-semibold">Decided</h2>
      {decided.length === 0 ? (
        <p className="text-sm text-muted-foreground">No decisions yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {decided.map((r: any) => (
            <RatificationRequestCard key={r.id} request={r} station={r.station} />
          ))}
        </div>
      )}
    </div>
  );
}
