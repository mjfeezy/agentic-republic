// Trust score updates. Deliberately small and transparent.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrustScore } from "@/lib/types";

const DOMAINS = [
  "software_engineering",
  "agent_security",
  "testing",
  "dependency_management",
  "repo_onboarding",
] as const;

export const TRUST_DOMAINS = DOMAINS;
export type TrustDomain = (typeof DOMAINS)[number];

export async function initializeTrustScores(
  client: SupabaseClient,
  representative_id: string,
  initial = 0.5,
) {
  const rows = DOMAINS.map((domain) => ({
    representative_id,
    domain,
    score: initial,
    evidence_count: 0,
  }));
  const { error } = await client
    .from("trust_scores")
    .upsert(rows, { onConflict: "representative_id,domain" });
  if (error) throw error;
}

async function adjust(
  client: SupabaseClient,
  representative_id: string,
  domain: string,
  delta: number,
) {
  const { data, error } = await client
    .from("trust_scores")
    .select("*")
    .eq("representative_id", representative_id)
    .eq("domain", domain)
    .maybeSingle();
  if (error) throw error;
  const current = (data as TrustScore | null) ?? null;
  const score = current ? current.score : 0.5;
  const evidence_count = current ? current.evidence_count : 0;
  const newScore = Math.max(0, Math.min(1, Number((score + delta).toFixed(3))));
  if (current) {
    const { error: upErr } = await client
      .from("trust_scores")
      .update({
        score: newScore,
        evidence_count: evidence_count + 1,
        last_updated: new Date().toISOString(),
      })
      .eq("id", current.id);
    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await client.from("trust_scores").insert({
      representative_id,
      domain,
      score: newScore,
      evidence_count: 1,
    });
    if (insErr) throw insErr;
  }
}

export async function updateTrustAfterPacketAdmitted(
  client: SupabaseClient,
  representative_id: string,
  domain: string,
) {
  await adjust(client, representative_id, domain || "software_engineering", +0.02);
}

export async function updateTrustAfterQuarantine(
  client: SupabaseClient,
  representative_id: string,
  domain: string,
) {
  await adjust(client, representative_id, domain || "agent_security", -0.05);
}

export async function updateTrustAfterRatifiedRecommendation(
  client: SupabaseClient,
  representative_id: string,
  domain: string,
) {
  await adjust(client, representative_id, domain || "software_engineering", +0.05);
}

export async function updateTrustAfterRejectedUnsafeRecommendation(
  client: SupabaseClient,
  representative_id: string,
  domain: string,
) {
  await adjust(client, representative_id, domain || "agent_security", -0.04);
}
