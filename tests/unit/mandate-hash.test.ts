import { describe, it, expect } from "vitest";
import { hashMandate, defaultMandateBody } from "@/lib/services/mandate";

describe("hashMandate", () => {
  it("is deterministic", () => {
    const a = hashMandate(defaultMandateBody() as any);
    const b = hashMandate(defaultMandateBody() as any);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ignores element ordering", () => {
    const body = defaultMandateBody();
    const a = hashMandate(body as any);
    const reversed = {
      ...body,
      may_share: [...body.may_share].reverse(),
      may_not_share: [...body.may_not_share].reverse(),
    };
    const b = hashMandate(reversed as any);
    expect(a).toBe(b);
  });

  it("changes when content changes", () => {
    const body = defaultMandateBody();
    const a = hashMandate(body as any);
    const b = hashMandate({
      ...body,
      may_not_share: [...body.may_not_share, "trade_secrets"],
    } as any);
    expect(a).not.toBe(b);
  });
});
