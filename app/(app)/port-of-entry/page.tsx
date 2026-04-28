import Link from "next/link";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AdmissionDecisionBadge,
  RiskBadge,
} from "@/components/civic/badges";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export default async function PortOfEntryPage() {
  const supabase = createSupabaseServerClient();
  const { data: scans } = await supabase
    .from("baggage_scans")
    .select("*, packet:civic_packets(id, title)")
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    <div>
      <PageHeader
        eyebrow="Port of Entry"
        title="Agent Port of Entry"
        description="Every representative agent must pass identity, mandate, baggage, and safety checks before entering a shared institution."
      />
      <ConceptHint>
        Each scan is a transcript of a packet's entry attempt: passport,
        mandate, visa, baggage (sensitive data), prompt-injection, and unsafe
        code. Drill into any row for the full result.
      </ConceptHint>

      <div className="grid gap-3">
        {(scans ?? []).map((s: any) => (
          <Link key={s.id} href={`/port-of-entry/scans/${s.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(s.created_at)}
                  </div>
                  <div className="truncate font-serif text-base font-medium">
                    {s.packet?.title ?? "(packet removed)"}
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {s.explanation}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RiskBadge level={s.risk_level} />
                  <AdmissionDecisionBadge decision={s.decision} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(scans ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scans yet. Submit a packet to see the Port of Entry in action.
          </p>
        ) : null}
      </div>
    </div>
  );
}
