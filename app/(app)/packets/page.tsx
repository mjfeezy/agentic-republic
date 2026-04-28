import Link from "next/link";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { Button } from "@/components/ui/button";
import { PacketCard } from "@/components/civic/cards";
import { EmptyState } from "@/components/civic/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PacketsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string };
}) {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from("civic_packets")
    .select("*, station:stations(*), committee:committees(*)")
    .order("created_at", { ascending: false });
  if (searchParams.status) q = q.eq("status", searchParams.status);
  if (searchParams.type) q = q.eq("packet_type", searchParams.type);
  const { data: packets } = await q;

  return (
    <div>
      <PageHeader
        eyebrow="Civic packets"
        title="Civic packets"
        description="Structured knowledge a representative carries into an institution. Each packet is identity-bound, sanitized, and admission-checked."
        actions={
          <Button asChild variant="seal">
            <Link href="/packets/new">New civic packet</Link>
          </Button>
        }
      />
      <ConceptHint>
        Five packet types: failure pattern, request for counsel, proposed
        standard, warning bulletin, and tool evaluation. Filter via the URL
        bar — e.g. <code className="font-mono">?status=quarantined</code>.
      </ConceptHint>
      {(packets ?? []).length === 0 ? (
        <EmptyState
          title="No packets match"
          description="Try clearing filters or creating a new packet."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packets!.map((p: any) => (
            <PacketCard
              key={p.id}
              packet={p}
              committee={p.committee}
              station={p.station}
            />
          ))}
        </div>
      )}
    </div>
  );
}
