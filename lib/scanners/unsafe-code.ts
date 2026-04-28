// Unsafe-code heuristic scanner. Pattern-matches dangerous shell snippets
// and obviously-malicious instructions. The scanner NEVER executes code —
// it inspects strings only.

import type { ScannerFinding, ScanCheckResult } from "@/lib/types";
import { walkStrings } from "./walk";

interface Rule {
  pattern: RegExp;
  severity: ScannerFinding["severity"];
  type: string;
  detail?: string;
}

const RULES: Rule[] = [
  { pattern: /\brm\s+-rf\b/i, severity: "critical", type: "rm_rf" },
  { pattern: /curl[^\n|]*\|\s*sh\b/i, severity: "critical", type: "curl_pipe_sh" },
  { pattern: /wget[^\n|]*\|\s*bash\b/i, severity: "critical", type: "wget_pipe_bash" },
  { pattern: /\bbase64\s+-d\b/i, severity: "high", type: "base64_decode" },
  { pattern: /\beval\s*\(/i, severity: "high", type: "eval_call" },
  { pattern: /\bexec\s*\(/i, severity: "high", type: "exec_call" },
  { pattern: /\bchmod\s+\+x\b/i, severity: "medium", type: "chmod_executable" },
  { pattern: /\.ssh\b/, severity: "high", type: "ssh_dir_reference", detail: "Reference to ~/.ssh credentials." },
  { pattern: /credential[_-]?store/i, severity: "high", type: "credential_store" },
  { pattern: /\bnpm\s+(?:run\s+)?postinstall\b/i, severity: "medium", type: "npm_postinstall" },
  { pattern: /sudo\s+rm/i, severity: "critical", type: "sudo_rm" },
  { pattern: /:(){:|:&};:/, severity: "critical", type: "fork_bomb" },
  { pattern: /\bnc\s+-e\b/i, severity: "high", type: "netcat_exec" },
  { pattern: /\bdocker\s+(?:run|exec)[^\n]*--privileged/i, severity: "high", type: "docker_privileged" },
];

export function scanUnsafeCode(input: unknown): ScanCheckResult {
  const findings: ScannerFinding[] = [];
  walkStrings(input, (text, path) => {
    for (const r of RULES) {
      const m = text.match(r.pattern);
      if (m) {
        findings.push({
          type: r.type,
          match: m[0].slice(0, 80),
          severity: r.severity,
          category: "unsafe_code",
          detail: r.detail ?? `Matched at ${path || "(root)"}`,
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
      ? `Detected ${dedup.length} unsafe-code pattern${dedup.length === 1 ? "" : "s"}.`
      : "No unsafe-code patterns detected.",
  };
}
