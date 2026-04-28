import Link from "next/link";
import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { PassportCard } from "@/components/civic/passport-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/civic/empty-state";

export default async function PassportsPage() {
  const supabase = createSupabaseServerClient();
  const { data: passports } = await supabase
    .from("passports")
    .select("*, representative:representatives(name, role), station:stations(name, station_type)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow="Passports"
        title="Agent passports"
        description="A passport binds a representative to its station, role, visa class, mandate hash, and expiration. Rotatable. Revocable. The Port of Entry checks every one."
      />
      <ConceptHint>
        For the MVP, signatures are mocked deterministic HMACs. The structure
        is the same shape a real PKI workflow would emit, so adding real
        signing later is mechanical.
      </ConceptHint>
      {(passports ?? []).length === 0 ? (
        <EmptyState
          title="No passports issued"
          description="Open a representative and issue one."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {passports!.map((p: any) => (
            <Link key={p.id} href={`/passports/${p.id}`}>
              <PassportCard
                passport={p}
                representative={p.representative}
                station={p.station}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
