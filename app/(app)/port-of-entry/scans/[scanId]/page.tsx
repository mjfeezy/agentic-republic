import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/civic/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AdmissionDecisionBadge,
  RiskBadge,
} from "@/components/civic/badges";
import {
  PortOfEntryTimeline,
  ScanResultCard,
} from "@/components/civic/port-of-entry-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export default async function ScanDetailPage({
  params,
}: {
  params: { scanId: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: scan } = await supabase
    .from("baggage_scans")
    .select("*, packet:civic_packets(*, station:stations(name)), passport:passports(*)")
    .eq("id", params.scanId)
    .maybeSingle();
  if (!scan) notFound();

  return (
    <div>
      <PageHeader
        eyebrow={`Scan · ${formatDateTime(scan.created_at)}`}
        title={scan.packet?.title ?? "Packet"}
        description={scan.explanation}
        actions={
          <div className="flex items-center gap-2">
            <RiskBadge level={scan.risk_level as any} />
            <AdmissionDecisionBadge decision={scan.decision as any} />
          </div>
        }
      />

      <div className="space-y-6">
        <PortOfEntryTimeline
          stages={[
            { key: "passport", result: scan.passport_result as any },
            { key: "mandate", result: scan.mandate_result as any },
            { key: "visa", result: scan.visa_result as any },
            { key: "baggage", result: scan.sensitive_data_result as any },
            {
              key: "injection",
              result: scan.prompt_injection_result as any,
            },
            { key: "unsafe", result: scan.malware_heuristic_result as any },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <ScanResultCard
            title="Passport validation"
            result={scan.passport_result as any}
          />
          <ScanResultCard
            title="Mandate validation"
            result={scan.mandate_result as any}
          />
          <ScanResultCard
            title="Visa validation"
            result={scan.visa_result as any}
          />
          <ScanResultCard
            title="Sensitive-data scan"
            result={scan.sensitive_data_result as any}
          />
          <ScanResultCard
            title="Prompt-injection scan"
            result={scan.prompt_injection_result as any}
          />
          <ScanResultCard
            title="Unsafe-code scan"
            result={scan.malware_heuristic_result as any}
          />
        </div>

        {scan.packet ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">Packet snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <Link
                  href={`/packets/${scan.packet.id}`}
                  className="underline"
                >
                  {scan.packet.title}
                </Link>{" "}
                — submitted from {scan.packet.station?.name}
              </p>
              <pre className="mt-3 overflow-auto rounded border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(scan.packet.body, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
