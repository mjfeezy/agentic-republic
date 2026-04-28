import { PageHeader, ConceptHint } from "@/components/civic/page-shell";
import { AuditLogTable } from "@/components/civic/audit-log-table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAuditLogs } from "@/lib/services/audit";

interface SearchParams {
  station?: string;
  packet?: string;
  representative?: string;
  event?: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createSupabaseServerClient();
  const logs = await listAuditLogs(supabase, {
    station_id: searchParams.station,
    packet_id: searchParams.packet,
    representative_id: searchParams.representative,
    event_type: searchParams.event,
    limit: 200,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Audit"
        title="Audit trail"
        description="Every important action — passport issuance, scan, admission, quarantine, ratification — is recorded here. Filter via the URL."
      />
      <ConceptHint>
        Filters supported via query parameters:{" "}
        <code className="font-mono">?event=civic_packet_quarantined</code>,{" "}
        <code className="font-mono">?station=&lt;uuid&gt;</code>,{" "}
        <code className="font-mono">?packet=&lt;uuid&gt;</code>.
      </ConceptHint>
      <AuditLogTable logs={logs} />
    </div>
  );
}
