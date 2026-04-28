import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { QuarantineCaseCard } from "@/components/civic/cards";
import { EmptyState } from "@/components/civic/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function QuarantinePage() {
  const supabase = createSupabaseServerClient();
  const { data: cases } = await supabase
    .from("quarantine_cases")
    .select("*, packet:civic_packets(id, title)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow="Quarantine"
        title="Quarantine"
        description="Packets that failed admission for sensitive content, prompt-injection, or unsafe-code findings end up here for redaction or rejection."
      />
      <ConceptHint>
        Reviewers can release a case after redaction (sends the packet back to
        published), reject permanently, or hand it back for resubmission.
      </ConceptHint>
      {(cases ?? []).length === 0 ? (
        <EmptyState
          title="Quarantine is empty"
          description="No risky packets to triage right now."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases!.map((c: any) => (
            <QuarantineCaseCard key={c.id} case_={c} packet={c.packet} />
          ))}
        </div>
      )}
    </div>
  );
}
