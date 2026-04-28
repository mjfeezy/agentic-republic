import type { AuditLog } from "@/lib/types";
import { formatDateTime, snakeToTitle } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const EVENT_VARIANT_MAP: Record<
  string,
  Parameters<typeof Badge>[0]["variant"]
> = {
  station_created: "ok",
  representative_created: "ok",
  passport_issued: "seal",
  passport_revoked: "danger",
  civic_packet_created: "secondary",
  civic_packet_scanned: "muted",
  civic_packet_admitted: "ok",
  civic_packet_published: "ok",
  civic_packet_quarantined: "danger",
  civic_packet_rejected: "danger",
  ratification_requested: "warn",
  ratification_approved: "ok",
  ratification_rejected: "danger",
  knowledge_item_created: "seal",
  trust_score_changed: "muted",
  visa_changed: "warn",
  mandate_updated: "warn",
};

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No audit events match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-mono">When</th>
            <th className="px-4 py-2 font-mono">Event</th>
            <th className="px-4 py-2 font-mono">Station</th>
            <th className="px-4 py-2 font-mono">Packet</th>
            <th className="px-4 py-2 font-mono">Metadata</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30">
              <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                {formatDateTime(log.created_at)}
              </td>
              <td className="px-4 py-2">
                <Badge
                  variant={EVENT_VARIANT_MAP[log.event_type] ?? "muted"}
                  className="text-[10px]"
                >
                  {snakeToTitle(log.event_type)}
                </Badge>
              </td>
              <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                {log.station_id?.slice(0, 8) ?? "—"}
              </td>
              <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                {log.packet_id?.slice(0, 8) ?? "—"}
              </td>
              <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                {Object.keys(log.metadata ?? {}).length > 0
                  ? JSON.stringify(log.metadata).slice(0, 60) +
                    (JSON.stringify(log.metadata).length > 60 ? "…" : "")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
