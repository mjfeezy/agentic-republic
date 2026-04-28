import { describe, it, expect } from "vitest";
import {
  computeRiskScore,
  riskLevelFromScore,
  decideAdmission,
} from "@/lib/scanners/risk";
import type { ScannerFinding } from "@/lib/types";

const make = (severity: ScannerFinding["severity"], category: ScannerFinding["category"] = "secret"): ScannerFinding => ({
  type: "x",
  match: "x",
  severity,
  category,
});

describe("computeRiskScore", () => {
  it("sums weighted severities", () => {
    const score = computeRiskScore([make("medium"), make("high")]);
    expect(score).toBe(45);
  });

  it("caps at 100", () => {
    const score = computeRiskScore(Array(10).fill(make("critical")));
    expect(score).toBe(100);
  });
});

describe("riskLevelFromScore", () => {
  it("maps boundaries", () => {
    expect(riskLevelFromScore(0)).toBe("low");
    expect(riskLevelFromScore(24)).toBe("low");
    expect(riskLevelFromScore(25)).toBe("medium");
    expect(riskLevelFromScore(49)).toBe("medium");
    expect(riskLevelFromScore(50)).toBe("high");
    expect(riskLevelFromScore(79)).toBe("high");
    expect(riskLevelFromScore(80)).toBe("critical");
    expect(riskLevelFromScore(100)).toBe("critical");
  });
});

describe("decideAdmission", () => {
  it("rejects if passport invalid", () => {
    const r = decideAdmission({
      riskScore: 0,
      findings: [],
      passportValid: false,
      mandateValid: true,
      visaValid: true,
    });
    expect(r.decision).toBe("reject");
  });

  it("rejects if visa insufficient", () => {
    const r = decideAdmission({
      riskScore: 0,
      findings: [],
      passportValid: true,
      mandateValid: true,
      visaValid: false,
    });
    expect(r.decision).toBe("reject");
  });

  it("quarantines on any non-low secret", () => {
    const r = decideAdmission({
      riskScore: 30,
      findings: [make("high", "secret")],
      passportValid: true,
      mandateValid: true,
      visaValid: true,
    });
    expect(r.decision).toBe("quarantine");
  });

  it("quarantines on critical prompt injection", () => {
    const r = decideAdmission({
      riskScore: 60,
      findings: [make("critical", "prompt_injection")],
      passportValid: true,
      mandateValid: true,
      visaValid: true,
    });
    expect(r.decision).toBe("quarantine");
  });

  it("admits when low risk and everything valid", () => {
    const r = decideAdmission({
      riskScore: 10,
      findings: [],
      passportValid: true,
      mandateValid: true,
      visaValid: true,
    });
    expect(r.decision).toBe("admit");
  });

  it("needs_human_review on mandate-only failure", () => {
    const r = decideAdmission({
      riskScore: 5,
      findings: [],
      passportValid: true,
      mandateValid: false,
      visaValid: true,
    });
    expect(r.decision).toBe("needs_human_review");
  });
});
