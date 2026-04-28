// Prompt-injection scanner. Looks for jailbreak-style instructions embedded
// in packet content. The phrases below are the ones explicitly listed in the
// product spec; we keep them comprehensive and case-insensitive but
// intentionally simple — defenders can layer real classifiers on top later.

import type { ScannerFinding, ScanCheckResult } from "@/lib/types";
import { walkStrings } from "./walk";

interface Phrase {
  pattern: RegExp;
  severity: ScannerFinding["severity"];
  type: string;
}

const PHRASES: Phrase[] = [
  { pattern: /\bignore\s+previous\s+instructions\b/i, severity: "critical", type: "ignore_previous" },
  { pattern: /\bdisregard\s+your\s+mandate\b/i, severity: "critical", type: "disregard_mandate" },
  { pattern: /\breveal\s+(?:your\s+)?system\s+prompt\b/i, severity: "critical", type: "reveal_system_prompt" },
  { pattern: /\bsend\s+private\s+logs\b/i, severity: "critical", type: "exfil_logs" },
  { pattern: /\bbypass\s+security\b/i, severity: "high", type: "bypass_security" },
  { pattern: /\boverride\s+policy\b/i, severity: "high", type: "override_policy" },
  { pattern: /\bact\s+as\s+unrestricted\b/i, severity: "high", type: "act_unrestricted" },
  { pattern: /\bdo\s+not\s+tell\s+the\s+user\b/i, severity: "high", type: "hide_from_user" },
  { pattern: /\b(developer|dan)\s+mode\b/i, severity: "high", type: "developer_mode" },
  { pattern: /\bexfiltrate\b/i, severity: "high", type: "exfiltrate_keyword" },
  { pattern: /\bleak\s+(?:private\s+)?data\b/i, severity: "high", type: "leak_keyword" },
  { pattern: /\bdisable\s+safety\b/i, severity: "critical", type: "disable_safety" },
  { pattern: /\byou\s+are\s+now\b/i, severity: "medium", type: "role_override_attempt" },
];

export function scanPromptInjection(input: unknown): ScanCheckResult {
  const findings: ScannerFinding[] = [];
  walkStrings(input, (text, path) => {
    for (const p of PHRASES) {
      const m = text.match(p.pattern);
      if (m) {
        findings.push({
          type: p.type,
          match: m[0],
          severity: p.severity,
          category: "prompt_injection",
          detail: `Matched at ${path || "(root)"}`,
        });
      }
    }
  });
  const seen = new Set<string>();
  const dedup = findings.filter((f) => {
    const k = `${f.type}::${f.match.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    passed: dedup.length === 0,
    findings: dedup,
    notes: dedup.length
      ? `Detected ${dedup.length} prompt-injection signal${dedup.length === 1 ? "" : "s"}.`
      : "No prompt-injection signals detected.",
  };
}
