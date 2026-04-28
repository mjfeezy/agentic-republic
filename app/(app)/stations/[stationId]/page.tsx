import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAuditLogs } from "@/lib/services/audit";
import { AuditLogTable } from "@/components/civic/audit-log-table";
import {
  KnowledgeItemCard,
  RatificationRequestCard,
  RepresentativeCard,
} from "@/components/civic/cards";

interface Props {
  params: { stationId: string };
}

export default async function StationDetailPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: station } = await supabase
    .from("stations")
    .select("*")
    .eq("id", params.stationId)
    .maybeSingle();
  if (!station) notFound();

  const [reps, mandate, knowledge, ratifications, packets] = await Promise.all([
    supabase.from("representatives").select("*").eq("station_id", station.id),
    supabase
      .from("mandates")
      .select("*")
      .eq("station_id", station.id)
      .eq("active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("station_knowledge")
      .select("*")
      .eq("station_id", station.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ratification_requests")
      .select("*")
      .eq("station_id", station.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("civic_packets")
      .select("*")
      .eq("originating_station_id", station.id)
      .order("created_at", { ascending: false }),
  ]);
  const audit = await listAuditLogs(supabase, {
    station_id: station.id,
    limit: 50,
  });

  return (
    <div>
      <PageHeader
        eyebrow={station.station_type}
        title={station.name}
        description={station.description}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/stations/${station.id}/mandate`}>Edit mandate</Link>
            </Button>
            <Button asChild variant="seal">
              <Link href="/packets/new">New civic packet</Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="representatives">
            Representatives ({reps.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="mandate">Mandate</TabsTrigger>
          <TabsTrigger value="knowledge">
            Knowledge ({knowledge.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="ratification">
            Ratification ({ratifications.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Allowed share categories
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {station.allowed_share_categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None set.</p>
                ) : (
                  station.allowed_share_categories.map((c: string) => (
                    <Badge key={c} variant="ok">
                      {c}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Prohibited share categories
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {station.prohibited_share_categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None set.</p>
                ) : (
                  station.prohibited_share_categories.map((c: string) => (
                    <Badge key={c} variant="danger">
                      ✕ {c}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 font-serif text-lg font-semibold">
              Civic packets from this station
            </h3>
            {(packets.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No packets submitted yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {packets.data!.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="rounded-md border bg-card px-4 py-2 text-sm"
                  >
                    <Link href={`/packets/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>
                    <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="representatives" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Button asChild variant="seal" size="sm">
              <Link href={`/representatives/new?stationId=${station.id}`}>
                Appoint representative
              </Link>
            </Button>
          </div>
          {(reps.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No representatives yet for this station.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reps.data!.map((r: any) => (
                <RepresentativeCard
                  key={r.id}
                  representative={r}
                  station={{ name: station.name }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mandate" className="mt-4">
          {mandate.data ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-base">
                    Active mandate · v{mandate.data.version}
                  </CardTitle>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/stations/${station.id}/mandate`}>Edit</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["May observe", mandate.data.may_observe, "ok"],
                    ["May share", mandate.data.may_share, "ok"],
                    ["May request", mandate.data.may_request, "seal"],
                    ["May NOT share", mandate.data.may_not_share, "danger"],
                    [
                      "May adopt without approval",
                      mandate.data.may_adopt_without_approval,
                      "secondary",
                    ],
                    [
                      "Requires approval",
                      mandate.data.requires_approval,
                      "warn",
                    ],
                  ] as const
                ).map(([label, items, variant]) => (
                  <div key={label}>
                    <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {label}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(items as string[]).map((c) => (
                        <Badge key={c} variant={variant as any}>
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active mandate yet.{" "}
              <Link
                href={`/stations/${station.id}/mandate`}
                className="underline"
              >
                Create one
              </Link>
              .
            </p>
          )}
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          {(knowledge.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accepted or rejected knowledge yet. Approve a ratification to
              create one.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {knowledge.data!.map((k: any) => (
                <KnowledgeItemCard key={k.id} item={k} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ratification" className="mt-4">
          {(ratifications.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ratification requests yet for this station.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {ratifications.data!.map((r: any) => (
                <RatificationRequestCard
                  key={r.id}
                  request={r}
                  station={{ name: station.name }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLogTable logs={audit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
