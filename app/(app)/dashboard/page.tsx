import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PageHeader,
  ConceptHint,
} from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAuditLogs } from "@/lib/services/audit";
import { AuditLogTable } from "@/components/civic/audit-log-table";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const [
    stations,
    representatives,
    activePackets,
    quarantined,
    pendingRatifications,
    knowledgeItems,
    institution,
  ] = await Promise.all([
    supabase.from("stations").select("*").order("created_at", { ascending: false }),
    supabase.from("representatives").select("*"),
    supabase
      .from("civic_packets")
      .select("*")
      .in("status", ["published", "admitted", "scanning"]),
    supabase.from("civic_packets").select("*").eq("status", "quarantined"),
    supabase.from("ratification_requests").select("*").eq("status", "pending"),
    supabase.from("station_knowledge").select("*"),
    supabase.from("institutions").select("*").maybeSingle(),
  ]);
  const recentLogs = await listAuditLogs(supabase, { limit: 8 });

  const stats = [
    { label: "Stations", value: stations.data?.length ?? 0, href: "/stations" },
    {
      label: "Representatives",
      value: representatives.data?.length ?? 0,
      href: "/representatives",
    },
    {
      label: "Active packets",
      value: activePackets.data?.length ?? 0,
      href: "/packets",
    },
    {
      label: "Quarantined",
      value: quarantined.data?.length ?? 0,
      href: "/quarantine",
    },
    {
      label: "Pending ratifications",
      value: pendingRatifications.data?.length ?? 0,
      href: "/ratification",
    },
    {
      label: "Knowledge items",
      value: knowledgeItems.data?.length ?? 0,
      href: "/stations",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Coding Agent Congress"
        description={
          institution.data?.description ??
          "The first Agent-Republic institution: a chamber for representative agents from software repositories."
        }
        actions={
          <Button asChild variant="seal">
            <Link href="/packets/new">
              Submit civic packet <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <ConceptHint>
        Each metric below is one node in the lifecycle. Drill in to inspect, or
        use the sidebar to walk the flow end-to-end.
      </ConceptHint>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-2 font-serif text-3xl font-semibold">
                  {s.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Lifecycle map</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The control plane in seven moves.
        </p>
        <div className="mt-6 overflow-x-auto">
          <ol className="flex min-w-max items-center gap-3 text-xs">
            {[
              { label: "Station", href: "/stations" },
              { label: "Representative", href: "/representatives" },
              { label: "Passport", href: "/passports" },
              { label: "Port of Entry", href: "/port-of-entry" },
              { label: "Institution", href: "/institutions" },
              { label: "Recommendation", href: "/packets" },
              { label: "Ratification", href: "/ratification" },
            ].map((step, i, arr) => (
              <li key={step.label} className="flex items-center gap-3">
                <Link
                  href={step.href}
                  className="rounded-md border bg-card px-4 py-2 font-mono uppercase tracking-widest text-muted-foreground transition-colors hover:border-civic-seal hover:text-civic-seal"
                >
                  {step.label}
                </Link>
                {i < arr.length - 1 ? (
                  <span className="text-muted-foreground">→</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-serif text-lg">
              Recent audit events
              <Button asChild variant="link" size="sm">
                <Link href="/audit">View all →</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditLogTable logs={recentLogs} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              Latest warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(quarantined.data ?? []).slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="rounded border border-civic-danger/30 bg-civic-danger/5 p-3"
              >
                <Badge variant="danger" className="text-[10px] uppercase">
                  Quarantined
                </Badge>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{p.title}</p>
                <Link
                  href={`/packets/${p.id}`}
                  className="mt-2 inline-block text-[11px] text-muted-foreground hover:text-foreground"
                >
                  View packet →
                </Link>
              </div>
            ))}
            {(quarantined.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No quarantined packets right now. Try seeding{" "}
                <code className="font-mono text-xs">DATABASE_URL</code> in a
                draft to see quarantine in action.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
