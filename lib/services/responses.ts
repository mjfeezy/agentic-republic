import type { SupabaseClient } from "@supabase/supabase-js";
import type { PacketResponse } from "@/lib/types";
import type { ResponseCreateInput } from "@/lib/validators";
import { logEvent } from "./audit";

export async function createResponse(
  client: SupabaseClient,
  input: ResponseCreateInput,
  actor_user_id?: string | null,
): Promise<PacketResponse> {
  const { data, error } = await client
    .from("packet_responses")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  await logEvent(client, {
    event_type: "response_created",
    actor_user_id: actor_user_id ?? null,
    actor_representative_id: input.representative_id,
    packet_id: input.packet_id,
    metadata: { response_type: input.response_type },
  });
  return data as PacketResponse;
}
