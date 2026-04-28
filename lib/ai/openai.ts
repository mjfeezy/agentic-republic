// Thin wrapper around the OpenAI client. Returns null when no API key is
// set so callers can gracefully degrade.

import OpenAI from "openai";

export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function aiCompleteJSON<T>(
  systemPrompt: string,
  userMessage: string,
): Promise<T | null> {
  const client = getOpenAI();
  if (!client) return null;
  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    console.error("[ai] JSON parse failed", err);
    return null;
  }
}

export async function aiCompleteText(
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const client = getOpenAI();
  if (!client) return null;
  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return completion.choices[0]?.message?.content ?? null;
}

export function aiAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
