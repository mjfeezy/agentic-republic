// Tiny audit-event helper. Every important state transition should call
// this. Failure to log is silently swallowed in production code paths so a
// missing audit row never blocks a user's primary action — but in the demo
// flow it should always succeed.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditEventType, AuditLog } from "@/lib/types";

export interface LogEventInput {
  event_type: AuditEventType | string;
  actor_user_id?: string | null;
  actor_representative_id?: string | null;
  station_id?: string | null;
  representative_id?: string | null;
  packet_id?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logEvent(
  client: SupabaseClient,
  event: LogEventInput,
): Promise<void> {
  const { error } = await client.from("audit_logs").insert({
    event_type: event.event_type,
    actor_user_id: event.actor_user_id ?? null,
    actor_representative_id: event.actor_representative_id ?? null,
    station_id: event.station_id ?? null,
    representative_id: event.representative_id ?? null,
    packet_id: event.packet_id ?? null,
    metadata: event.metadata ?? {},
  });
  if (error) {
    console.error("[audit] logEvent failed", error);
  }
}

export async function listAuditLogs(
  client: SupabaseClient,
  filters: {
    station_id?: string;
    representative_id?: string;
    packet_id?: string;
    event_type?: string;
    limit?: number;
  } = {},
): Promise<AuditLog[]> {
  let q = client
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.station_id) q = q.eq("station_id", filters.station_id);
  if (filters.representative_id)
    q = q.eq("representative_id", filters.representative_id);
  if (filters.packet_id) q = q.eq("packet_id", filters.packet_id);
  if (filters.event_type) q = q.eq("event_type", filters.event_type);
  q = q.limit(filters.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  return (data as AuditLog[]) ?? [];
}
