import { describe, it, expect } from "vitest";
import { validatePassport, validateVisa, validateMandate } from "@/lib/scanners/passport";
import type { Passport, Representative, Mandate } from "@/lib/types";

const baseRep: Representative = {
  id: "rep_1",
  station_id: "stn_1",
  name: "Test Rep",
  role: "station_representative",
  domain_focus: ["software_engineering"],
  visa_class: "representative",
  status: "active",
  trust_score_default: 0.5,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const basePassport: Passport = {
  id: "pp_1",
  representative_id: "rep_1",
  station_id: "stn_1",
  issuer: "station_authority",
  role: "station_representative",
  station_type: "software_repository",
  allowed_domains: ["software_engineering"],
  visa_class: "representative",
  mandate_hash: "abc",
  valid_from: "2026-01-01T00:00:00Z",
  valid_until: "2030-01-01T00:00:00Z",
  revocation_status: "valid",
  signature_mock: "xx",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("validatePassport", () => {
  it("passes when valid and bound", () => {
    const r = validatePassport({
      passport: basePassport,
      representative: baseRep,
      expectedStationId: "stn_1",
      packetDomain: "software_engineering",
    });
    expect(r.passed).toBe(true);
    expect(r.findings).toHaveLength(0);
  });

  it("fails when revoked", () => {
    const r = validatePassport({
      passport: { ...basePassport, revocation_status: "revoked" },
      representative: baseRep,
      expectedStationId: "stn_1",
      packetDomain: "software_engineering",
    });
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.type === "passport_revoked")).toBe(true);
  });

  it("fails when expired", () => {
    const r = validatePassport({
      passport: { ...basePassport, valid_until: "2020-01-01" },
      representative: baseRep,
      expectedStationId: "stn_1",
      packetDomain: "software_engineering",
    });
    expect(r.findings.some((f) => f.type === "passport_expired")).toBe(true);
  });

  it("flags station mismatch", () => {
    const r = validatePassport({
      passport: basePassport,
      representative: baseRep,
      expectedStationId: "stn_other",
      packetDomain: "software_engineering",
    });
    expect(r.findings.some((f) => f.type === "passport_station_mismatch")).toBe(true);
  });
});

describe("validateVisa", () => {
  it("visitor cannot submit packets", () => {
    const r = validateVisa({ visaClass: "visitor", requestedAction: "submit_packet" });
    expect(r.passed).toBe(false);
  });
  it("representative can submit", () => {
    const r = validateVisa({ visaClass: "representative", requestedAction: "submit_packet" });
    expect(r.passed).toBe(true);
  });
  it("quarantine cannot submit", () => {
    const r = validateVisa({ visaClass: "quarantine", requestedAction: "submit_packet" });
    expect(r.passed).toBe(false);
  });
});

const baseMandate: Mandate = {
  id: "m1",
  station_id: "stn_1",
  representative_id: "rep_1",
  version: 1,
  may_observe: [],
  may_share: ["anonymized failure patterns", "general workflow lessons"],
  may_request: [],
  may_not_share: ["source code", "credentials", "customer data"],
  may_adopt_without_approval: [],
  requires_approval: [],
  active: true,
  created_at: "x",
  updated_at: "x",
};

describe("validateMandate", () => {
  it("passes when content stays clear of may_not_share", () => {
    const r = validateMandate({
      mandate: baseMandate,
      packetTitle: "Failure pattern",
      packetSummary: "agents do X",
      packetBody: { symptoms: ["X happens"] },
      packetType: "failure_pattern",
    });
    expect(r.passed).toBe(true);
  });

  it("flags content containing 'source code'", () => {
    const r = validateMandate({
      mandate: baseMandate,
      packetTitle: "Failure pattern",
      packetSummary: "we shipped this source code",
      packetBody: {},
      packetType: "failure_pattern",
    });
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.match === "source code")).toBe(true);
  });
});
