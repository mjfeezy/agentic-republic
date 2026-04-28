// Sensitive-data scanner. Deterministic regex/keyword match. Intentionally
// noisy on the side of caution — the system is allowed to escalate to human
// review when it's not sure. The goal is "credibly demonstrate the control
// pattern", not "production DLP."

import type { ScannerFinding, ScanCheckResult } from "@/lib/types";
import { walkStrings } from "./walk";

interface Rule {
  id: string;
  pattern: RegExp;
  severity: ScannerFinding["severity"];
  category: ScannerFinding["category"];
  type: string;
  detail?: string;
}

// Order roughly by severity. The scanner reports every match, but admission
// decisions weight critical findings the most.
const RULES: Rule[] = [
  // High-confidence secrets
  {
    id: "private_key_header",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
    severity: "critical",
    category: "secret",
    type: "private_key_header",
    detail: "Private key block header detected.",
  },
  {
    id: "aws_access_key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    severity: "critical",
    category: "secret",
    type: "aws_access_key_id",
  },
  {
    id: "openai_key",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
    severity: "critical",
    category: "secret",
    type: "openai_api_key",
  },
  {
    id: "supabase_service_role",
    pattern: /SUPABASE_SERVICE_ROLE_KEY/i,
    severity: "high",
    category: "secret",
    type: "supabase_service_role",
  },
  {
    id: "database_url",
    pattern: /\bDATABASE_URL\b/,
    severity: "high",
    category: "secret",
    type: "database_url_token",
    detail: "DATABASE_URL identifier detected. Possible connection string.",
  },
  {
    id: "postgres_url",
    pattern: /postgres(?:ql)?:\/\/[^\s]+/i,
    severity: "high",
    category: "secret",
    type: "postgres_connection_string",
  },
  {
    id: "aws_secret_access_key",
    pattern: /AWS_SECRET_ACCESS_KEY/i,
    severity: "high",
    category: "secret",
    type: "aws_secret_token",
  },
  {
    id: "openai_api_key_token",
    pattern: /OPENAI_API_KEY/i,
    severity: "medium",
    category: "secret",
    type: "openai_token_label",
  },
  {
    id: "env_token",
    pattern: /\b\.env\b/,
    severity: "medium",
    category: "secret",
    type: "dotenv_reference",
  },
  {
    id: "private_key_token",
    pattern: /\bPRIVATE_KEY\b/,
    severity: "high",
    category: "secret",
    type: "private_key_token",
  },

  // PII
  {
    id: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    severity: "medium",
    category: "pii",
    type: "email_address",
  },
  {
    id: "phone",
    pattern: /\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/,
    severity: "low",
    category: "pii",
    type: "phone_number",
  },
  {
    id: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/,
    severity: "high",
    category: "pii",
    type: "us_ssn_format",
  },
  {
    id: "ssn_token",
    pattern: /\b(?:ssn|social\s+security)\b/i,
    severity: "medium",
    category: "pii",
    type: "ssn_keyword",
  },
  {
    id: "customer_id",
    pattern: /customer_id/i,
    severity: "medium",
    category: "pii",
    type: "customer_identifier",
  },

  // Confidentiality markers
  {
    id: "confidential",
    pattern: /\bconfidential\b/i,
    severity: "medium",
    category: "policy",
    type: "confidentiality_marker",
  },
  {
    id: "internal_only",
    pattern: /\binternal\s+only\b/i,
    severity: "medium",
    category: "policy",
    type: "internal_only_marker",
  },
  {
    id: "do_not_share",
    pattern: /\bdo\s+not\s+share\b/i,
    severity: "high",
    category: "policy",
    type: "do_not_share_marker",
  },
  {
    id: "legal_strategy",
    pattern: /\blegal\s+strategy\b/i,
    severity: "high",
    category: "policy",
    type: "legal_strategy_marker",
  },
  {
    id: "contract_terms",
    pattern: /\bcontract\s+terms\b/i,
    severity: "medium",
    category: "policy",
    type: "contract_terms_marker",
  },
  {
    id: "unreleased",
    pattern: /\bunreleased\b/i,
    severity: "medium",
    category: "policy",
    type: "unreleased_marker",
  },
  {
    id: "roadmap",
    pattern: /\broadmap\b/i,
    severity: "low",
    category: "policy",
    type: "roadmap_marker",
  },

  // Source code leakage — detection is approximate. We look for triple-fence
  // blocks and characteristic syntax rather than try to identify languages.
  {
    id: "code_fence",
    pattern: /```[\s\S]+?```/,
    severity: "medium",
    category: "source_code",
    type: "fenced_code_block",
  },
  {
    id: "function_decl",
    pattern: /\b(function|class|async\s+function)\s+[A-Za-z_]\w*\s*\(/,
    severity: "low",
    category: "source_code",
    type: "function_declaration",
  },
];

/**
 * Walk every string in the packet and apply every rule. Two passes:
 *   1) First pass collects all matches with their character ranges.
 *   2) Second pass suppresses lower-severity matches that overlap a
 *      higher-severity match in the same string — e.g. the email-address
 *      rule firing on `user:pass@host` inside a postgres connection string
 *      that already matched `postgres_connection_string`. Without this
 *      suppression the scanner produces noisy duplicate findings on the
 *      same span.
 */
const SEVERITY_RANK: Record<ScannerFinding["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

interface RawMatch {
  rule: Rule;
  matchText: string;
  start: number;
  end: number;
  path: string;
}

export function scanSensitiveData(input: unknown): ScanCheckResult {
  const raw: RawMatch[] = [];
  walkStrings(input, (text, path) => {
    for (const rule of RULES) {
      const m = text.match(rule.pattern);
      if (m && typeof m.index === "number") {
        raw.push({
          rule,
          matchText: m[0],
          start: m.index,
          end: m.index + m[0].length,
          path,
        });
      }
    }
  });

  // Sort by severity descending, then by start. Higher-severity wins overlap.
  raw.sort((a, b) => {
    const sevDiff =
      SEVERITY_RANK[b.rule.severity] - SEVERITY_RANK[a.rule.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.start - b.start;
  });

  // For each match, check if a stronger match already covers the same range
  // in the same path. If yes, suppress this one.
  const accepted: RawMatch[] = [];
  for (const candidate of raw) {
    const overshadowed = accepted.some(
      (a) =>
        a.path === candidate.path &&
        SEVERITY_RANK[a.rule.severity] >= SEVERITY_RANK[candidate.rule.severity] &&
        // Either the candidate is fully inside the accepted span, or they
        // overlap meaningfully (>50% of candidate's length).
        candidate.start >= a.start - 4 &&
        candidate.end <= a.end + 4,
    );
    if (!overshadowed) accepted.push(candidate);
  }

  const findings: ScannerFinding[] = accepted.map((a) => ({
    type: a.rule.type,
    match: a.matchText.slice(0, 80),
    severity: a.rule.severity,
    category: a.rule.category,
    detail: a.rule.detail ?? `Matched at ${a.path || "(root)"}`,
  }));

  // Original dedup-by-(type, match) preserved for safety.
  const seen = new Set<string>();
  const dedup = findings.filter((f) => {
    const key = `${f.type}::${f.match}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    passed: dedup.length === 0,
    findings: dedup,
    notes: dedup.length
      ? `Detected ${dedup.length} sensitive-data finding${dedup.length === 1 ? "" : "s"}.`
      : "No sensitive data detected.",
  };
}

