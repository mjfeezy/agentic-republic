// Passport, mandate, and visa validators. These run before the content
// scans — if a representative can't even present a valid passport, no
// amount of clean baggage matters.

import type {
  CivicPacketBody,
  Mandate,
  Passport,
  Representative,
  ScanCheckResult,
  ScannerFinding,
  VisaClass,
} from "@/lib/types";
import { walkStrings } from "./walk";

interface PassportValidationInput {
  passport: Passport | null;
  representative: Representative | null;
  expectedStationId: string;
  packetDomain: string;
  now?: Date;
}

export function validatePassport({
  passport,
  representative,
  expectedStationId,
  packetDomain,
  now = new Date(),
}: PassportValidationInput): ScanCheckResult {
  const findings: ScannerFinding[] = [];

  if (!passport) {
    findings.push({
      type: "passport_missing",
      match: "no_passport",
      severity: "critical",
      category: "policy",
      detail: "No passport on file for representative.",
    });
    return { passed: false, findings, notes: "Passport missing." };
  }
  if (!representative) {
    findings.push({
      type: "representative_missing",
      match: "no_representative",
      severity: "critical",
      category: "policy",
      detail: "Representative does not exist.",
    });
    return { passed: false, findings, notes: "Representative not found." };
  }
  if (passport.representative_id !== representative.id) {
    findings.push({
      type: "passport_owner_mismatch",
      match: passport.representative_id,
      severity: "critical",
      category: "policy",
      detail: "Passport not bound to this representative.",
    });
  }
  if (passport.station_id !== expectedStationId) {
    findings.push({
      type: "passport_station_mismatch",
      match: passport.station_id,
      severity: "high",
      category: "policy",
      detail: "Passport station differs from packet's originating station.",
    });
  }
  if (passport.revocation_status !== "valid") {
    findings.push({
      type: "passport_revoked",
      match: passport.revocation_status,
      severity: "critical",
      category: "policy",
      detail: `Passport status: ${passport.revocation_status}.`,
    });
  }
  const validUntil = new Date(passport.valid_until).getTime();
  if (Number.isFinite(validUntil) && validUntil < now.getTime()) {
    findings.push({
      type: "passport_expired",
      match: passport.valid_until,
      severity: "critical",
      category: "policy",
      detail: "Passport expiration has passed.",
    });
  }
  if (
    packetDomain &&
    passport.allowed_domains.length > 0 &&
    !passport.allowed_domains.includes(packetDomain)
  ) {
    findings.push({
      type: "domain_outside_passport",
      match: packetDomain,
      severity: "medium",
      category: "policy",
      detail: `Domain '${packetDomain}' not in passport.allowed_domains.`,
    });
  }
  return {
    passed: findings.every((f) => f.severity !== "critical"),
    findings,
    notes: findings.length
      ? `Passport check produced ${findings.length} finding(s).`
      : "Passport identity, station binding, expiration, and domain all check out.",
  };
}

interface MandateValidationInput {
  mandate: Mandate | null;
  packetTitle: string;
  packetSummary: string;
  packetBody: CivicPacketBody;
  packetType: string;
}

export function validateMandate({
  mandate,
  packetTitle,
  packetSummary,
  packetBody,
  packetType,
}: MandateValidationInput): ScanCheckResult {
  const findings: ScannerFinding[] = [];
  if (!mandate || !mandate.active) {
    findings.push({
      type: "mandate_missing",
      match: "no_active_mandate",
      severity: "high",
      category: "mandate",
      detail: "No active mandate for this representative.",
    });
    return { passed: false, findings, notes: "Mandate missing or inactive." };
  }

  // Check that the packet type isn't outside the mandate's may_share scope.
  // We keep this fuzzy — match any may_share string against the packet type
  // or its general category.
  const allowedShareJoined = mandate.may_share.join(" ").toLowerCase();
  const packetTypeWords = packetType.replace(/_/g, " ");
  const sharable =
    mandate.may_share.length === 0 ||
    allowedShareJoined.includes(packetTypeWords) ||
    allowedShareJoined.includes("anonymized") ||
    allowedShareJoined.includes("workflow") ||
    allowedShareJoined.includes("standard") ||
    allowedShareJoined.includes("evaluation") ||
    allowedShareJoined.includes("warning");
  if (!sharable) {
    findings.push({
      type: "packet_type_not_in_mandate",
      match: packetType,
      severity: "medium",
      category: "mandate",
      detail: "Packet type is not listed in mandate.may_share.",
    });
  }

  // Walk every string and look for content that hits may_not_share entries.
  // The list is short so a literal substring check is sufficient.
  const prohibitedPhrases = mandate.may_not_share
    .map((p) => p.toLowerCase().trim())
    .filter(Boolean);

  const allText: { text: string; path: string }[] = [];
  walkStrings({ packetTitle, packetSummary, packetBody }, (t, p) =>
    allText.push({ text: t, path: p }),
  );
  for (const { text, path } of allText) {
    const lower = text.toLowerCase();
    for (const phrase of prohibitedPhrases) {
      if (phrase.length >= 4 && lower.includes(phrase)) {
        findings.push({
          type: "mandate_violation",
          match: phrase,
          severity: "high",
          category: "mandate",
          detail: `Content at ${path} matches mandate.may_not_share entry "${phrase}".`,
        });
      }
    }
  }

  return {
    passed: findings.length === 0,
    findings,
    notes: findings.length
      ? "Mandate check found content overlapping may_not_share entries."
      : "Packet content stays within mandate.",
  };
}

interface VisaValidationInput {
  visaClass: VisaClass;
  requestedAction: "submit_packet" | "respond" | "view";
}

const VISA_PERMISSIONS: Record<VisaClass, Set<string>> = {
  visitor: new Set(["view"]),
  representative: new Set(["view", "submit_packet", "respond"]),
  committee: new Set(["view", "submit_packet", "respond"]),
  consortium: new Set(["view", "submit_packet", "respond"]),
  diplomatic: new Set(["view", "submit_packet", "respond"]),
  quarantine: new Set(["view"]),
};

export function validateVisa({
  visaClass,
  requestedAction,
}: VisaValidationInput): ScanCheckResult {
  const allowed = VISA_PERMISSIONS[visaClass]?.has(requestedAction) ?? false;
  if (allowed) {
    return {
      passed: true,
      findings: [],
      notes: `Visa '${visaClass}' permits action '${requestedAction}'.`,
    };
  }
  return {
    passed: false,
    findings: [
      {
        type: "visa_insufficient",
        match: visaClass,
        severity: "critical",
        category: "policy",
        detail: `Visa class '${visaClass}' is not permitted to '${requestedAction}'.`,
      },
    ],
    notes: `Visa '${visaClass}' is insufficient for action '${requestedAction}'.`,
  };
}
