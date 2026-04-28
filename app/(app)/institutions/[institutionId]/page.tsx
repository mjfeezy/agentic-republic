import { notFound } from "next/navigation";
import { PageHeader } from "@/components/civic/page-shell";
import { CommitteeCard, PacketCard } from "@/components/civic/cards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface Props {
  params: { institutionId: string };
}

export default async function InstitutionDetailPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: institution } = await supabase
    .from("institutions")
    .select("*")
    .eq("id", params.institutionId)
    .maybeSingle();
  if (!institution) notFound();

  const [committees, packets] = await Promise.all([
    supabase.from("committees").select("*").eq("institution_id", institution.id),
    supabase
      .from("civic_packets")
      .select("*, station:stations(*), committee:committees(*)")
      .eq("institution_id", institution.id)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
  ]);

  // packet count per committee
  const counts: Record<string, number> = {};
  for (const p of packets.data ?? []) {
    if (p.committee_id) counts[p.committee_id] = (counts[p.committee_id] ?? 0) + 1;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institution"
        title={institution.name}
        description={institution.description}
      />

      <h2 className="mb-3 font-serif text-lg font-semibold">Committees</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(committees.data ?? []).map((c: any) => (
          <CommitteeCard key={c.id} committee={c} packetCount={counts[c.id] ?? 0} />
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-serif text-lg font-semibold">
        Active published packets
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(packets.data ?? []).slice(0, 12).map((p: any) => (
          <PacketCard
            key={p.id}
            packet={p}
            committee={p.committee}
            station={p.station}
          />
        ))}
        {(packets.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No published packets yet.</p>
        ) : null}
      </div>
    </div>
  );
}
