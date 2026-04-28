// Civic packet pipeline: create, scan via Port of Entry, route admission /
// quarantine, publish on success. The scanning step is the linchpin — it
// produces a baggage_scans row, a quarantine_cases row when needed, and
// updates packet status atomically (best-effort with Supabase REST).

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BaggageScan,
  CivicPacket,
  Mandate,
  Passport,
  Representative,
} from "@/lib/types";
import { runPortOfEntry } from "@/lib/scanners";
import { logEvent } from "./audit";
import {
  updateTrustAfterPacketAdmitted,
  updateTrustAfterQuarantine,
} from "./trust";

export interface SubmitForScanInput {
  packet: CivicPacket;
  passport: Passport | null;
  representative: Representative | null;
  mandate: Mandate | null;
  actor_user_id?: string | null;
}

export interface SubmitForScanResult {
  scan: BaggageScan;
  packetStatus: CivicPacket["status"];
  quarantineId?: string;
}

export async function submitPacketForScan(
  client: SupabaseClient,
  input: SubmitForScanInput,
): Promise<SubmitForScanResult> {
  const { packet, passport, representative, mandate } = input;

  // 1. Set packet to scanning state
  await client
    .from("civic_packets")
    .update({ status: "scanning", scan_status: "pending" })
    .eq("id", packet.id);

  // 2. Run the Port of Entry pipeline
  const result = runPortOfEntry({
    packet,
    passport,
    representative,
    mandate,
  });

  // 3. Persist the baggage_scans row
  const { data: scanRow, error: scanErr } = await client
    .from("baggage_scans")
    .insert({
      packet_id: packet.id,
      representative_id: representative?.id ?? null,
      passport_id: passport?.id ?? null,
      passport_result: result.passport_result,
      mandate_result: result.mandate_result,
      visa_result: result.visa_result,
      sensitive_data_result: result.sensitive_data_result,
      prompt_injection_result: result.prompt_injection_result,
      malware_heuristic_result: result.malware_heuristic_result,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      decision: result.decision,
      explanation: result.explanation,
    })
    .select()
    .single();
  if (scanErr) throw scanErr;
  const scan = scanRow as BaggageScan;

  // 4. Apply the decision to the packet
  let packetStatus: CivicPacket["status"];
  let quarantineId: string | undefined;
  switch (result.decision) {
    case "admit":
      packetStatus = "published";
      await client
        .from("civic_packets")
        .update({
          status: "published",
          scan_status: "clean",
          quarantine_status: "none",
        })
        .eq("id", packet.id);
      if (representative) {
        await updateTrustAfterPacketAdmitted(
          client,
          representative.id,
          packet.domain,
        );
      }
      break;
    case "needs_human_review":
      packetStatus = "scanning";
      await client
        .from("civic_packets")
        .update({ status: "scanning", scan_status: "flagged" })
        .eq("id", packet.id);
      break;
    case "quarantine": {
      packetStatus = "quarantined";
      const { data: qRow, error: qErr } = await client
        .from("quarantine_cases")
        .insert({
          packet_id: packet.id,
          scan_id: scan.id,
          reason: result.explanation,
          status: "open",
        })
        .select()
        .single();
      if (qErr) throw qErr;
      quarantineId = (qRow as { id: string }).id;
      await client
        .from("civic_packets")
        .update({
          status: "quarantined",
          scan_status: "quarantined",
          quarantine_status: "open",
        })
        .eq("id", packet.id);
      if (representative) {
        await updateTrustAfterQuarantine(
          client,
          representative.id,
          packet.domain,
        );
      }
      break;
    }
    case "reject":
    default:
      packetStatus = "rejected";
      await client
        .from("civic_packets")
        .update({
          status: "rejected",
          scan_status: "flagged",
          quarantine_status: "rejected",
        })
        .eq("id", packet.id);
      break;
  }

  // 5. Audit
  await logEvent(client, {
    event_type: "civic_packet_scanned",
    actor_user_id: input.actor_user_id ?? null,
    actor_representative_id: representative?.id ?? null,
    station_id: packet.originating_station_id,
    representative_id: representative?.id ?? null,
    packet_id: packet.id,
    metadata: {
      decision: result.decision,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
    },
  });
  if (result.decision === "admit") {
    await logEvent(client, {
      event_type: "civic_packet_admitted",
      actor_user_id: input.actor_user_id ?? null,
      station_id: packet.originating_station_id,
      packet_id: packet.id,
      metadata: { committee_id: packet.committee_id },
    });
    await logEvent(client, {
      event_type: "civic_packet_published",
      actor_user_id: input.actor_user_id ?? null,
      station_id: packet.originating_station_id,
      packet_id: packet.id,
      metadata: { committee_id: packet.committee_id },
    });
  } else if (result.decision === "quarantine") {
    await logEvent(client, {
      event_type: "civic_packet_quarantined",
      actor_user_id: input.actor_user_id ?? null,
      station_id: packet.originating_station_id,
      packet_id: packet.id,
      metadata: { reason: result.explanation, scan_id: scan.id },
    });
  } else if (result.decision === "reject") {
    await logEvent(client, {
      event_type: "civic_packet_rejected",
      actor_user_id: input.actor_user_id ?? null,
      station_id: packet.originating_station_id,
      packet_id: packet.id,
      metadata: { reason: result.explanation },
    });
  }

  return { scan, packetStatus, quarantineId };
}
