// AI-assisted packet drafting. POST raw incident notes; receive a sanitized
// draft body. The local sensitive-data scanner runs FIRST — if it flags
// secrets in the input, we refuse to forward to OpenAI.

import { NextResponse } from "next/server";
import { aiAvailable, aiCompleteJSON } from "@/lib/ai/openai";
import { REPRESENTATIVE_AGENT_PROMPT } from "@/lib/prompts";
import { scanSensitiveData } from "@/lib/scanners/sensitive-data";

export async function POST(req: Request) {
  if (!aiAvailable()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured." },
      { status: 503 },
    );
  }
  const { stationContext, incidentNotes } = (await req.json()) as {
    stationContext?: string;
    incidentNotes?: string;
  };
  if (!incidentNotes) {
    return NextResponse.json(
      { error: "incidentNotes required." },
      { status: 400 },
    );
  }

  // Pre-flight scan — never forward secrets to the LLM.
  const localScan = scanSensitiveData({ stationContext, incidentNotes });
  const hasSecret = localScan.findings.some(
    (f) => f.category === "secret" && f.severity !== "low",
  );
  if (hasSecret) {
    return NextResponse.json(
      {
        error:
          "Local scanner detected secrets in the input. Redact before requesting an AI draft.",
        findings: localScan.findings,
      },
      { status: 400 },
    );
  }

  const userMessage = JSON.stringify({
    station_context: stationContext ?? "",
    incident_notes: incidentNotes,
    instruction:
      "Produce a JSON object with keys: packet_type (one of: failure_pattern, request_for_counsel, proposed_standard, warning_bulletin, tool_evaluation), title, summary, domain, sensitivity, confidence_score, body: { symptoms (array of strings), hypothesized_cause, evidence (object), request }.",
  });
  const draft = await aiCompleteJSON<unknown>(
    REPRESENTATIVE_AGENT_PROMPT,
    userMessage,
  );
  if (!draft) {
    return NextResponse.json(
      { error: "AI returned no content." },
      { status: 502 },
    );
  }
  return NextResponse.json({ draft, ai_assisted: true });
}
