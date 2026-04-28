// Plain-English explanation of a baggage_scans row. Reads only
// non-sensitive scan metadata; the user is asking about an existing scan
// they already have access to.

import { NextResponse } from "next/server";
import { aiAvailable, aiCompleteText } from "@/lib/ai/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SYSTEM = `You are a security analyst explaining the result of an Agent Port of Entry scan to a non-technical reader. Be concrete: state the decision, why, and one or two next actions. Do not invent findings that aren't in the scan.`;

export async function POST(req: Request) {
  if (!aiAvailable()) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 503 });
  }
  const { scanId } = (await req.json()) as { scanId?: string };
  if (!scanId) return NextResponse.json({ error: "scanId required" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: scan } = await supabase
    .from("baggage_scans")
    .select("decision, risk_score, risk_level, explanation, sensitive_data_result, prompt_injection_result, malware_heuristic_result, mandate_result, passport_result")
    .eq("id", scanId)
    .maybeSingle();
  if (!scan) return NextResponse.json({ error: "scan not found" }, { status: 404 });

  const text = await aiCompleteText(
    SYSTEM,
    `Here is the structured scan output to summarize:\n\n${JSON.stringify(scan, null, 2)}`,
  );
  return NextResponse.json({ explanation: text });
}
