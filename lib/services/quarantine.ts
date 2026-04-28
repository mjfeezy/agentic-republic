// Quarantine review actions: list, release, reject, resubmit cleaned.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CivicPacket, QuarantineCase } from "@/lib/types";
import { logEvent } from "./audit";

export async function listQuarantineCases(
  client: SupabaseClient,
): Promise<(QuarantineCase & { packet: CivicPacket | null })[]> {
  const { data, error } = await client
    .from("quarantine_cases")
    .select("*, packet:civic_packets(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as (QuarantineCase & { packet: CivicPacket | null })[]) ?? [];
}

export async function releaseQuarantine(
  client: SupabaseClient,
  args: { case_id: string; reviewer_id?: string | null; notes?: string },
) {
  const { data: row, error } = await client
    .from("quarantine_cases")
    .update({
      status: "released",
      resolution: args.notes ?? "Released by reviewer.",
      assigned_reviewer_id: args.reviewer_id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", args.case_id)
    .select()
    .single();
  if (error) throw error;
  const c = row as QuarantineCase;
  // Move the packet back to admitted/published
  await client
    .from("civic_packets")
    .update({
      status: "published",
      scan_status: "clean",
      quarantine_status: "released",
    })
    .eq("id", c.packet_id);
  await logEvent(client, {
    event_type: "civic_packet_admitted",
    packet_id: c.packet_id,
    metadata: {
      via: "quarantine_release",
      notes: args.notes ?? null,
      case_id: c.id,
    },
  });
}

export async function rejectQuarantine(
  client: SupabaseClient,
  args: { case_id: string; reviewer_id?: string | null; notes?: string },
) {
  const { data: row, error } = await client
    .from("quarantine_cases")
    .update({
      status: "rejected",
      resolution: args.notes ?? "Permanently rejected by reviewer.",
      assigned_reviewer_id: args.reviewer_id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", args.case_id)
    .select()
    .single();
  if (error) throw error;
  const c = row as QuarantineCase;
  await client
    .from("civic_packets")
    .update({
      status: "rejected",
      scan_status: "flagged",
      quarantine_status: "rejected",
    })
    .eq("id", c.packet_id);
  await logEvent(client, {
    event_type: "civic_packet_rejected",
    packet_id: c.packet_id,
    metadata: { via: "quarantine_rejection", notes: args.notes ?? null },
  });
}

export async function setUnderReview(
  client: SupabaseClient,
  args: { case_id: string; reviewer_id?: string | null },
) {
  const { error } = await client
    .from("quarantine_cases")
    .update({
      status: "under_review",
      assigned_reviewer_id: args.reviewer_id ?? null,
    })
    .eq("id", args.case_id);
  if (error) throw error;
}
