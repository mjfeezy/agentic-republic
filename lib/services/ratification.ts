// Ratification gate. Approval converts a recommendation into a station
// knowledge item. Rejection still creates a "rejected_pattern" knowledge
// row so the station remembers it considered and declined the idea.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PacketResponse,
  ProposedChangeType,
  RatificationRequest,
  RiskLevel,
} from "@/lib/types";
import { logEvent } from "./audit";
import {
  updateTrustAfterRatifiedRecommendation,
  updateTrustAfterRejectedUnsafeRecommendation,
} from "./trust";

export const APPROVAL_RULES: Record<
  ProposedChangeType,
  { approval: string; second_review?: boolean; tests_required?: boolean; rollback_plan?: boolean }
> = {
  educational_summary: { approval: "automatic" },
  local_memory_note: { approval: "governor_agent_or_human" },
  agent_instruction_change: { approval: "human_required" },
  tool_installation: { approval: "human_required" },
  code_change: { approval: "human_required", tests_required: true, rollback_plan: true },
  destructive_action: { approval: "explicit_human_confirmation", second_review: true },
};

interface CreateRatificationRequestInput {
  station_id: string;
  packet_id: string;
  response_id: string;
  title: string;
  recommendation_summary: string;
  proposed_change_type: ProposedChangeType;
  risk_level?: RiskLevel;
  actor_user_id?: string | null;
}

export async function createRatificationRequest(
  client: SupabaseClient,
  input: CreateRatificationRequestInput,
): Promise<RatificationRequest> {
  const rules = APPROVAL_RULES[input.proposed_change_type];
  const { data, error } = await client
    .from("ratification_requests")
    .insert({
      station_id: input.station_id,
      packet_id: input.packet_id,
      response_id: input.response_id,
      title: input.title,
      recommendation_summary: input.recommendation_summary,
      proposed_change_type: input.proposed_change_type,
      risk_level: input.risk_level ?? "low",
      approval_required: rules.approval,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;

  await logEvent(client, {
    event_type: "ratification_requested",
    actor_user_id: input.actor_user_id ?? null,
    station_id: input.station_id,
    packet_id: input.packet_id,
    metadata: {
      proposed_change_type: input.proposed_change_type,
      risk_level: input.risk_level,
    },
  });
  return data as RatificationRequest;
}

interface DecideInput {
  request_id: string;
  reviewer_id?: string | null;
  notes?: string | null;
  actor_user_id?: string | null;
}

export async function approveRatification(
  client: SupabaseClient,
  input: DecideInput,
) {
  const { data: req, error } = await client
    .from("ratification_requests")
    .update({
      status: "approved",
      decision: "approved",
      decision_notes: input.notes ?? null,
      reviewer_id: input.reviewer_id ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.request_id)
    .select()
    .single();
  if (error) throw error;
  const request = req as RatificationRequest;

  // Create the resulting station knowledge item
  let response: PacketResponse | null = null;
  if (request.response_id) {
    const { data } = await client
      .from("packet_responses")
      .select("*")
      .eq("id", request.response_id)
      .maybeSingle();
    response = (data as PacketResponse | null) ?? null;
  }

  await client.from("station_knowledge").insert({
    station_id: request.station_id,
    title: request.title,
    summary: request.recommendation_summary,
    source_packet_id: request.packet_id,
    source_response_id: request.response_id,
    knowledge_type: "accepted_pattern",
    status: "active",
    adopted_at: new Date().toISOString(),
    notes:
      response?.proposed_pattern ??
      "Ratified via approval workflow. See source packet for full evidence.",
  });

  await logEvent(client, {
    event_type: "ratification_approved",
    actor_user_id: input.actor_user_id ?? null,
    station_id: request.station_id,
    packet_id: request.packet_id,
    metadata: { ratification_id: request.id, notes: input.notes ?? null },
  });
  await logEvent(client, {
    event_type: "knowledge_item_created",
    actor_user_id: input.actor_user_id ?? null,
    station_id: request.station_id,
    packet_id: request.packet_id,
    metadata: { title: request.title },
  });

  if (response) {
    await updateTrustAfterRatifiedRecommendation(
      client,
      response.representative_id,
      "software_engineering",
    );
  }
  return request;
}

export async function rejectRatification(
  client: SupabaseClient,
  input: DecideInput,
) {
  const { data: req, error } = await client
    .from("ratification_requests")
    .update({
      status: "rejected",
      decision: "rejected",
      decision_notes: input.notes ?? null,
      reviewer_id: input.reviewer_id ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.request_id)
    .select()
    .single();
  if (error) throw error;
  const request = req as RatificationRequest;

  // Record the rejection as a rejected_pattern knowledge item so the
  // station remembers it deliberately declined the idea.
  await client.from("station_knowledge").insert({
    station_id: request.station_id,
    title: `Rejected: ${request.title}`,
    summary: request.recommendation_summary,
    source_packet_id: request.packet_id,
    source_response_id: request.response_id,
    knowledge_type: "rejected_pattern",
    status: "active",
    notes: input.notes ?? "Rejected during ratification.",
  });

  await logEvent(client, {
    event_type: "ratification_rejected",
    actor_user_id: input.actor_user_id ?? null,
    station_id: request.station_id,
    packet_id: request.packet_id,
    metadata: { ratification_id: request.id, notes: input.notes ?? null },
  });

  if (request.response_id) {
    const { data } = await client
      .from("packet_responses")
      .select("representative_id")
      .eq("id", request.response_id)
      .maybeSingle();
    const repId = (data as { representative_id: string } | null)
      ?.representative_id;
    if (repId && (request.risk_level === "high" || request.risk_level === "critical")) {
      await updateTrustAfterRejectedUnsafeRecommendation(
        client,
        repId,
        "agent_security",
      );
    }
  }
  return request;
}

export async function markImplemented(
  client: SupabaseClient,
  input: DecideInput,
) {
  const { error } = await client
    .from("ratification_requests")
    .update({
      status: "implemented",
      decision_notes: input.notes ?? null,
    })
    .eq("id", input.request_id);
  if (error) throw error;
}
