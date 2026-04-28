// Port of Entry orchestrator. Combines passport / mandate / visa
// validators with the content scanners and produces a final admission
// decision plus a structured BaggageScan record ready for persistence.

import type {
  AdmissionDecision,
  CivicPacket,
  Mandate,
  Passport,
  Representative,
  RiskLevel,
  ScanCheckResult,
  ScannerFinding,
} from "@/lib/types";
import { validateMandate, validatePassport, validateVisa } from "./passport";
import { scanSensitiveData } from "./sensitive-data";
import { scanPromptInjection } from "./prompt-injection";
import { scanUnsafeCode } from "./unsafe-code";
import {
  aggregateFindings,
  computeRiskScore,
  decideAdmission,
  riskLevelFromScore,
} from "./risk";

export interface PortOfEntryInput {
  packet: Pick<
    CivicPacket,
    "id" | "title" | "summary" | "body" | "domain" | "packet_type" | "originating_station_id" | "representative_id"
  >;
  passport: Passport | null;
  representative: Representative | null;
  mandate: Mandate | null;
}

export interface PortOfEntryResult {
  passport_result: ScanCheckResult;
  mandate_result: ScanCheckResult;
  visa_result: ScanCheckResult;
  sensitive_data_result: ScanCheckResult;
  prompt_injection_result: ScanCheckResult;
  malware_heuristic_result: ScanCheckResult;
  risk_score: number;
  risk_level: RiskLevel;
  decision: AdmissionDecision;
  explanation: string;
  all_findings: ScannerFinding[];
}

export function runPortOfEntry(input: PortOfEntryInput): PortOfEntryResult {
  const { packet, passport, representative, mandate } = input;

  const passport_result = validatePassport({
    passport,
    representative,
    expectedStationId: packet.originating_station_id,
    packetDomain: packet.domain,
  });

  const visa_result = validateVisa({
    visaClass: passport?.visa_class ?? representative?.visa_class ?? "visitor",
    requestedAction: "submit_packet",
  });

  const mandate_result = validateMandate({
    mandate,
    packetTitle: packet.title,
    packetSummary: packet.summary,
    packetBody: packet.body,
    packetType: packet.packet_type,
  });

  const scanInput = {
    title: packet.title,
    summary: packet.summary,
    body: packet.body,
  };
  const sensitive_data_result = scanSensitiveData(scanInput);
  const prompt_injection_result = scanPromptInjection(scanInput);
  const malware_heuristic_result = scanUnsafeCode(scanInput);

  // Risk score is computed only from the *content* scanners. Identity
  // failures are handled separately so we can give clearer explanations.
  const all_findings = aggregateFindings(
    sensitive_data_result,
    prompt_injection_result,
    malware_heuristic_result,
  );
  const risk_score = computeRiskScore(all_findings);
  const risk_level = riskLevelFromScore(risk_score);

  const passportValid = passport_result.passed;
  const visaValid = visa_result.passed;
  const mandateValid = mandate_result.passed;

  const { decision, explanation } = decideAdmission({
    riskScore: risk_score,
    findings: all_findings,
    passportValid,
    mandateValid,
    visaValid,
  });

  return {
    passport_result,
    mandate_result,
    visa_result,
    sensitive_data_result,
    prompt_injection_result,
    malware_heuristic_result,
    risk_score,
    risk_level,
    decision,
    explanation,
    all_findings: [
      ...passport_result.findings,
      ...visa_result.findings,
      ...mandate_result.findings,
      ...all_findings,
    ],
  };
}

export {
  scanSensitiveData,
  scanPromptInjection,
  scanUnsafeCode,
  validatePassport,
  validateMandate,
  validateVisa,
  computeRiskScore,
  riskLevelFromScore,
  decideAdmission,
};
