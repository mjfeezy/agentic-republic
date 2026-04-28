import { notFound } from "next/navigation";
import { PageHeader } from "@/components/civic/page-shell";
import { PacketCard } from "@/components/civic/cards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface Props {
  params: { institutionId: string; committeeId: string };
}

export default async function CommitteeDetailPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: committee } = await supabase
    .from("committees")
    .select("*, institution:institutions(name)")
    .eq("id", params.committeeId)
    .maybeSingle();
  if (!committee) notFound();

  const { data: packets } = await supabase
    .from("civic_packets")
    .select("*, station:stations(*), committee:committees(*)")
    .eq("committee_id", params.committeeId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow={`${committee.institution?.name} · committee`}
        title={committee.name}
        description={committee.description}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(packets ?? []).map((p: any) => (
          <PacketCard
            key={p.id}
            packet={p}
            committee={p.committee}
            station={p.station}
          />
        ))}
        {(packets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No packets in this committee yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
