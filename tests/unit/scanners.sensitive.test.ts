import { describe, it, expect } from "vitest";
import { scanSensitiveData } from "@/lib/scanners/sensitive-data";

describe("scanSensitiveData", () => {
  it("flags DATABASE_URL identifiers as a high-severity secret", () => {
    const result = scanSensitiveData({
      body: { notes: "we use DATABASE_URL=postgres://app:hunter2@db/acme for prod" },
    });
    expect(result.passed).toBe(false);
    const types = result.findings.map((f) => f.type);
    expect(types).toContain("database_url_token");
    expect(types).toContain("postgres_connection_string");
  });

  it("flags AWS access keys as critical", () => {
    const result = scanSensitiveData({ body: "AKIAIOSFODNN7EXAMPLE" });
    expect(result.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("flags private key headers", () => {
    const result = scanSensitiveData(
      "header: -----BEGIN RSA PRIVATE KEY----- abc",
    );
    expect(result.findings[0].type).toBe("private_key_header");
    expect(result.findings[0].severity).toBe("critical");
  });

  it("clean text produces no findings", () => {
    const result = scanSensitiveData({
      title: "Agents keep editing generated files",
      body: { symptoms: ["changes disappear after build"] },
    });
    expect(result.passed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("flags SSN format", () => {
    const result = scanSensitiveData("ID 123-45-6789 maybe");
    const ssnHit = result.findings.find((f) => f.type === "us_ssn_format");
    expect(ssnHit).toBeDefined();
  });

  it("suppresses email_address match when overshadowed by a higher-severity secret on the same span", () => {
    // The connection string contains "hunter2@db.internal" which would
    // otherwise trigger the email_address rule. The higher-severity
    // postgres_connection_string rule should suppress it.
    const result = scanSensitiveData(
      "use DATABASE_URL=postgresql://app:hunter2@db.internal:5432/acme",
    );
    const emails = result.findings.filter((f) => f.type === "email_address");
    expect(emails).toHaveLength(0);
    // The connection-string rule should still fire.
    expect(
      result.findings.some((f) => f.type === "postgres_connection_string"),
    ).toBe(true);
  });

  it("still flags a real email outside any connection string", () => {
    const result = scanSensitiveData(
      "Reach me at jdoe@example.com if you have questions.",
    );
    expect(result.findings.some((f) => f.type === "email_address")).toBe(true);
  });
});
