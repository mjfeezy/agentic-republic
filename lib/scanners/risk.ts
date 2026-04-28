// Risk scoring + admission decision. Pure functions so they're trivial to
// unit test.

import type {
  AdmissionDecision,
  RiskLevel,
  ScanCheckResult,
  ScannerFinding,
} from "@/lib/types";

const SEVERITY_WEIGHT: Record<ScannerFinding["severity"], number> = {
  low: 5,
  medium: 15,
  high: 30,
  critical: 60,
};

export function aggregateFindings(...checks: ScanCheckResult[]): ScannerFinding[] {
  return checks.flatMap((c) => c.findings);
}

export function computeRiskScore(findings: ScannerFinding[]): number {
  let score = 0;
  for (const f of findings) {
    score += SEVERITY_WEIGHT[f.severity] ?? 0;
  }
  // Cap at 100 — multiple criticals just cement the verdict.
  return Math.min(100, score);
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 80) return "high";
  return "critical";
}

interface AdmissionInput {
  riskScore: number;
  findings: ScannerFinding[];
  passportValid: boolean;
  mandateValid: boolean;
  visaValid: boolean;
}

export function decideAdmission(input: AdmissionInput): {
  decision: AdmissionDecision;
  explanation: string;
} {
  const { riskScore, findings, passportValid, mandateValid, visaValid } = input;

  if (!passportValid) {
    return {
      decision: "reject",
      explanation:
        "Passport is invalid, expired, or revoked. Representative cannot present at the Port of Entry.",
    };
  }
  if (!visaValid) {
    return {
      decision: "reject",
      explanation:
        "Visa class is insufficient for the requested action (e.g. only Visitor and Quarantine cannot submit packets).",
    };
  }

  // Hard quarantine triggers regardless of total score
  const hasSecret = findings.some((f) => f.category === "secret" && f.severity !== "low");
  const hasCriticalInjection = findings.some(
    (f) => f.category === "prompt_injection" && f.severity === "critical",
  );
  const hasCriticalUnsafe = findings.some(
    (f) => f.category === "unsafe_code" && f.severity === "critical",
  );

  if (hasSecret) {
    return {
      decision: "quarantine",
      explanation:
        "Sensitive credentials or connection-string identifiers detected. Routed to quarantine for redaction.",
    };
  }
  if (hasCriticalInjection) {
    return {
      decision: "quarantine",
      explanation:
        "Critical prompt-injection signals detected. Quarantined pending human review.",
    };
  }
  if (hasCriticalUnsafe) {
    return {
      decision: "quarantine",
      explanation:
        "Critical unsafe-code patterns detected. Quarantined pending review.",
    };
  }
  if (!mandateValid) {
    return {
      decision: "needs_human_review",
      explanation:
        "Packet content appears to overlap mandate prohibitions. Requires human review before admission.",
    };
  }

  if (riskScore < 25) {
    return {
      decision: "admit",
      explanation: "Passport, mandate, visa, and baggage scan all clean.",
    };
  }
  if (riskScore < 50) {
    return {
      decision: "needs_human_review",
      explanation:
        "Moderate risk score. Sending to human review before admission to the institution.",
    };
  }
  if (riskScore < 80) {
    return {
      decision: "quarantine",
      explanation:
        "High-risk findings exceeded the auto-admit threshold. Routed to quarantine for review.",
    };
  }
  return {
    decision: "quarantine",
    explanation:
      "Critical risk findings. Quarantine review required before any further action.",
  };
}
