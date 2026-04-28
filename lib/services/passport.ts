// Passport issuance helpers. The "signature" is a deterministic hash, not a
// real cryptographic signature — but the surrounding flow (issue → bind →
// expire → revoke) mirrors what a real PKI workflow would look like.

import crypto from "crypto";
import type { Passport, Representative } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function mockSignature(payload: object): string {
  const seed = process.env.PASSPORT_SIGNING_SEED ?? "agent-republics-mvp";
  return crypto
    .createHmac("sha256", seed)
    .update(JSON.stringify(payload))
    .digest("hex");
}

interface IssuePassportInput {
  representative: Representative;
  stationType: string;
  allowedDomains: string[];
  mandateHash: string;
  validForDays?: number;
}

export function buildPassportPayload({
  representative,
  stationType,
  allowedDomains,
  mandateHash,
  validForDays = 365,
}: IssuePassportInput): Omit<
  Passport,
  "id" | "created_at" | "updated_at" | "signature_mock"
> & { signature_mock: string } {
  const now = new Date();
  const valid_from = now.toISOString();
  const valid_until = new Date(
    now.getTime() + validForDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const payload = {
    representative_id: representative.id,
    station_id: representative.station_id,
    issuer: "station_authority",
    role: representative.role,
    station_type: stationType,
    allowed_domains: allowedDomains,
    visa_class: representative.visa_class,
    mandate_hash: mandateHash,
    valid_from,
    valid_until,
  };
  const signature_mock = mockSignature(payload);
  return {
    ...payload,
    revocation_status: "valid",
    signature_mock,
  };
}

export async function issuePassport(
  client: SupabaseClient,
  input: IssuePassportInput,
): Promise<Passport> {
  const payload = buildPassportPayload(input);
  // Revoke any prior valid passports for this representative — only one
  // active passport at a time.
  await client
    .from("passports")
    .update({ revocation_status: "revoked" })
    .eq("representative_id", input.representative.id)
    .eq("revocation_status", "valid");
  const { data, error } = await client
    .from("passports")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Passport;
}

export async function revokePassport(
  client: SupabaseClient,
  passportId: string,
): Promise<void> {
  const { error } = await client
    .from("passports")
    .update({ revocation_status: "revoked" })
    .eq("id", passportId);
  if (error) throw error;
}
