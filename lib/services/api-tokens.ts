// API token issuance + verification. Tokens are SHA-256 hashed at rest.
// Plaintext format: rs_<station-slug>_<random>. The seed script and a future
// admin UI emit the plaintext exactly once and store only the hash.

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Representative, Station } from "@/lib/types";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(stationSlug = "station"): {
  plaintext: string;
  hash: string;
} {
  const random = crypto.randomBytes(20).toString("base64url");
  const slug = stationSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
  const plaintext = `rs_${slug}_${random}`;
  return { plaintext, hash: hashToken(plaintext) };
}

export interface TokenAuthContext {
  token_id: string;
  station: Station;
  representative: Representative;
}

/**
 * Verify a presented token against the api_tokens table. Returns the bound
 * station + representative when valid, or null when the token is missing,
 * malformed, or revoked. Caller is responsible for using the result.
 */
export async function verifyToken(
  client: SupabaseClient,
  token: string,
): Promise<TokenAuthContext | null> {
  if (!token || typeof token !== "string") return null;
  const hash = hashToken(token);
  const { data, error } = await client
    .from("api_tokens")
    .select("id, station:stations(*), representative:representatives(*)")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;
  // Touch last_used_at without blocking the verify path.
  client
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => null);
  return {
    token_id: data.id as string,
    station: data.station as unknown as Station,
    representative: data.representative as unknown as Representative,
  };
}
