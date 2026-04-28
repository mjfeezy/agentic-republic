// Agent passport rendered as a tactile Representative ID card. Mirrors the
// brand book mockup: temple shield at top, black "REPRESENTATIVE AGENT" stripe
// with the agent ID, "CLEARANCE: TRUSTED" line, smart-card chip at bottom-left,
// AR seal at bottom-right.

import type { Passport, Representative, Station } from "@/lib/types";
import { Crest, Seal } from "@/components/civic/logo";
import { PassportStatusBadge, VisaBadge } from "./badges";
import { formatDate } from "@/lib/utils";

interface PassportCardProps {
  passport: Passport;
  representative?: Pick<Representative, "name" | "role"> | null;
  station?: Pick<Station, "name" | "station_type"> | null;
}

function clearanceFromVisa(visa: string): string {
  switch (visa) {
    case "diplomatic":
      return "DIPLOMATIC";
    case "consortium":
      return "CONSORTIUM";
    case "committee":
      return "COMMITTEE";
    case "representative":
      return "TRUSTED";
    case "visitor":
      return "VISITOR";
    case "quarantine":
      return "RESTRICTED";
    default:
      return visa.toUpperCase();
  }
}

function shortId(id: string): string {
  // Format like AR-XXXX-XXXX
  const compact = id.replace(/-/g, "").toUpperCase();
  return `AR-${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
}

export function PassportCard({
  passport,
  representative,
  station,
}: PassportCardProps) {
  const clearance = clearanceFromVisa(passport.visa_class);
  return (
    <div className="overflow-hidden rounded-xl border border-civic-gold/40 bg-card shadow-md">
      {/* Header: brand strip with crest + "AGENTIC REPUBLIC" wordmark */}
      <div className="flex items-center justify-between border-b border-civic-gold/30 bg-civic-ivory px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Crest size={28} />
          <div className="leading-tight">
            <div className="font-serif text-sm font-semibold tracking-tight text-civic-ink">
              Agentic Republic
            </div>
            <div className="kicker">Representative Agent ID</div>
          </div>
        </div>
        <PassportStatusBadge status={passport.revocation_status} />
      </div>

      {/* Identity strip — dark band with name + role */}
      <div className="bg-civic-ink px-5 py-4 text-civic-ivory">
        <div className="kicker !text-civic-gold/80">Representative</div>
        <div className="mt-1 font-serif text-2xl font-semibold leading-tight">
          {representative?.name ?? "Representative Agent"}
        </div>
        <div className="mt-0.5 text-[12px] opacity-80 font-mono">
          {representative?.role ?? "station_representative"}
        </div>
      </div>

      {/* Clearance band — gold stripe */}
      <div className="flex items-center justify-between bg-civic-gold/90 px-5 py-2 text-civic-ink">
        <div className="text-[10px] font-mono uppercase tracking-[0.32em]">
          Clearance
        </div>
        <div className="font-serif text-sm font-semibold tracking-wider">
          {clearance}
        </div>
        <VisaBadge visa={passport.visa_class} />
      </div>

      {/* Detail grid */}
      <div className="bg-card px-5 py-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[11px]">
          <div>
            <dt className="opacity-60">Agent ID</dt>
            <dd className="mt-0.5 font-medium tracking-wider text-civic-ink">
              {shortId(passport.id)}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Issuer</dt>
            <dd className="mt-0.5 font-medium text-civic-ink">
              {passport.issuer}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Station</dt>
            <dd className="mt-0.5 truncate font-medium text-civic-ink">
              {station?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Type</dt>
            <dd className="mt-0.5 font-medium text-civic-ink">
              {passport.station_type}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Domains</dt>
            <dd className="mt-0.5 font-medium text-civic-ink">
              {passport.allowed_domains.length
                ? passport.allowed_domains.join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Valid until</dt>
            <dd className="mt-0.5 font-medium text-civic-ink">
              {formatDate(passport.valid_until)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Bottom row — chip + seal */}
      <div className="flex items-center justify-between gap-4 border-t border-civic-gold/30 bg-civic-ivory px-5 py-4">
        <Chip />
        <div className="flex-1 px-3">
          <div className="kicker">Mandate hash</div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {passport.mandate_hash}
          </div>
          <div className="kicker mt-2">Signature (mock)</div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {passport.signature_mock}
          </div>
        </div>
        <Seal size={56} />
      </div>
    </div>
  );
}

function Chip() {
  // Stylized smart-card chip — purely decorative.
  return (
    <svg
      viewBox="0 0 48 36"
      width="48"
      height="36"
      className="shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chip-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(38 30% 75%)" />
          <stop offset="100%" stopColor="hsl(38 30% 50%)" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="44"
        height="32"
        rx="5"
        fill="url(#chip-grad)"
        stroke="hsl(38 30% 40%)"
        strokeWidth="0.6"
      />
      <g stroke="hsl(38 30% 35%)" strokeWidth="0.8" fill="none">
        <line x1="2" y1="13" x2="46" y2="13" />
        <line x1="2" y1="23" x2="46" y2="23" />
        <line x1="14" y1="2" x2="14" y2="34" />
        <line x1="34" y1="2" x2="34" y2="34" />
        <rect x="14" y="13" width="20" height="10" fill="hsl(38 30% 60%)" />
      </g>
    </svg>
  );
}
