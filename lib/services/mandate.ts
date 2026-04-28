// Mandate hashing + default templates. The hash is mocked but stable: a
// SHA-256 over the canonical JSON of the mandate's permission arrays.
// Stations recompute it whenever the mandate changes; the passport
// references that hash so revocation can be triggered on mandate edits.

import crypto from "crypto";
import type { Mandate } from "@/lib/types";
import type { MandateUpsertInput } from "@/lib/validators";

export function hashMandate(
  mandate:
    | Mandate
    | (Omit<MandateUpsertInput, "station_id" | "representative_id"> & {
        version?: number;
      }),
): string {
  // Canonical: sort each permission array to make the hash order-independent.
  const canonical = JSON.stringify({
    may_observe: [...mandate.may_observe].sort(),
    may_share: [...mandate.may_share].sort(),
    may_request: [...mandate.may_request].sort(),
    may_not_share: [...mandate.may_not_share].sort(),
    may_adopt_without_approval: [...mandate.may_adopt_without_approval].sort(),
    requires_approval: [...mandate.requires_approval].sort(),
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function defaultMandateBody(): Omit<
  MandateUpsertInput,
  "station_id" | "representative_id"
> {
  return {
    may_observe: [
      "task outcomes",
      "test results",
      "approved agent summaries",
      "recurring error reports",
      "human feedback labels",
    ],
    may_share: [
      "anonymized failure patterns",
      "generalized workflow lessons",
      "non-sensitive tool evaluations",
      "proposed standards",
    ],
    may_request: [
      "debugging patterns",
      "documentation templates",
      "security recommendations",
      "workflow conventions",
    ],
    may_not_share: [
      "source code",
      "credentials",
      "customer data",
      "private legal strategy",
      "unreleased product plans",
      "personal information",
    ],
    may_adopt_without_approval: [
      "educational summaries",
      "non-binding knowledge notes",
    ],
    requires_approval: [
      "changes to agent instructions",
      "changes to code",
      "installation of new tools",
      "changes to permissions",
      "updates to station memory",
    ],
  };
}
