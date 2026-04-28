// Brand marks for Agentic Republic.
//
// - <Crest /> renders the temple-on-shield with a node graph at the base.
//   Used as the primary identifier in nav, login, and landing.
// - <Seal /> renders the circular AR monogram with the four-word surround:
//   REPRESENT · EXCHANGE · RATIFY · PROTECT (and TRUST BY DESIGN imprint).
// - <Wordmark /> pairs the crest with the typeset name.
//
// Colors track the CSS theme variables so dark mode and tints work automatically.

import { cn } from "@/lib/utils";

interface CrestProps {
  className?: string;
  size?: number;
  /** When true, renders an outline-only version sized for inline icon use. */
  outline?: boolean;
}

export function Crest({ className, size = 48, outline = false }: CrestProps) {
  if (outline) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M32 4 L52 12 V30 C52 44 42 54 32 60 C22 54 12 44 12 30 V12 Z" />
        <line x1="18" y1="22" x2="46" y2="22" />
        <polygon points="32,12 22,22 42,22" />
        <line x1="22" y1="22" x2="22" y2="42" />
        <line x1="28" y1="22" x2="28" y2="42" />
        <line x1="36" y1="22" x2="36" y2="42" />
        <line x1="42" y1="22" x2="42" y2="42" />
        <line x1="18" y1="42" x2="46" y2="42" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 80 96"
      width={size}
      height={(size * 96) / 80}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ar-shield-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(216 65% 14%)" />
          <stop offset="60%" stopColor="hsl(216 65% 11%)" />
          <stop offset="100%" stopColor="hsl(218 16% 14%)" />
        </linearGradient>
        <linearGradient id="ar-shield-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(38 30% 70%)" />
          <stop offset="100%" stopColor="hsl(38 30% 50%)" />
        </linearGradient>
      </defs>

      {/* Laurel branches */}
      <g stroke="hsl(38 30% 60%)" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M8 60 C 6 70 10 84 22 90" />
        <path d="M11 65 q -3 2 -3 6" />
        <path d="M13 72 q -3 2 -3 6" />
        <path d="M15 79 q -3 2 -3 6" />
      </g>
      <g stroke="hsl(38 30% 60%)" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M72 60 C 74 70 70 84 58 90" />
        <path d="M69 65 q 3 2 3 6" />
        <path d="M67 72 q 3 2 3 6" />
        <path d="M65 79 q 3 2 3 6" />
      </g>

      {/* Shield body */}
      <path
        d="M40 6 L70 14 V36 C70 60 56 78 40 88 C24 78 10 60 10 36 V14 Z"
        fill="url(#ar-shield-fill)"
        stroke="url(#ar-shield-stroke)"
        strokeWidth="1.6"
      />

      {/* Star at the top */}
      <polygon
        points="40,16 41.6,20.6 46.4,20.6 42.5,23.4 44.1,28 40,25.2 35.9,28 37.5,23.4 33.6,20.6 38.4,20.6"
        fill="hsl(38 30% 70%)"
      />

      {/* Temple — pediment */}
      <polygon
        points="40,30 26,40 54,40"
        fill="hsl(38 30% 70%)"
      />
      {/* Architrave */}
      <rect x="24" y="40" width="32" height="3" fill="hsl(38 30% 70%)" />
      {/* Columns (4) */}
      <rect x="27" y="44" width="3" height="20" fill="hsl(38 30% 70%)" />
      <rect x="33" y="44" width="3" height="20" fill="hsl(38 30% 70%)" />
      <rect x="44" y="44" width="3" height="20" fill="hsl(38 30% 70%)" />
      <rect x="50" y="44" width="3" height="20" fill="hsl(38 30% 70%)" />
      {/* Stylobate */}
      <rect x="24" y="64" width="32" height="3" fill="hsl(38 30% 70%)" />

      {/* Node graph below the temple */}
      <g stroke="hsl(183 78% 55%)" strokeWidth="1.4" fill="hsl(183 78% 55%)">
        <line x1="32" y1="74" x2="40" y2="78" />
        <line x1="48" y1="74" x2="40" y2="78" />
        <circle cx="32" cy="74" r="2" />
        <circle cx="48" cy="74" r="2" />
        <circle cx="40" cy="78" r="2" />
      </g>
    </svg>
  );
}

interface WordmarkProps {
  className?: string;
  /** small tightens spacing for nav use */
  size?: "sm" | "md" | "lg";
}

export function Wordmark({ className, size = "md" }: WordmarkProps) {
  const crestSize = size === "sm" ? 22 : size === "lg" ? 44 : 32;
  const titleClasses =
    size === "sm"
      ? "text-sm"
      : size === "lg"
        ? "text-2xl"
        : "text-base";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Crest size={crestSize} />
      <div className="leading-none">
        <div
          className={cn(
            "font-serif font-semibold tracking-tight text-foreground",
            titleClasses,
          )}
        >
          Agentic Republic
        </div>
        {size !== "sm" ? (
          <div className="kicker mt-1">Secure institutions for AI agents</div>
        ) : null}
      </div>
    </div>
  );
}

interface SealProps {
  className?: string;
  size?: number;
}

export function Seal({ className, size = 120 }: SealProps) {
  // Round seal: the four operating words orbit an "AR" monogram, with a
  // "TRUST BY DESIGN" arc imprint along the bottom.
  const ringText = "REPRESENT · EXCHANGE · RATIFY · PROTECT · ";
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-label="Agentic Republic seal"
    >
      <defs>
        <path
          id="seal-arc-top"
          d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
        />
        <path
          id="seal-arc-bottom"
          d="M 100,100 m -64,0 a 64,64 0 1,0 128,0"
        />
      </defs>

      {/* Outer ring */}
      <circle cx="100" cy="100" r="92" fill="hsl(36 26% 95%)" stroke="hsl(38 30% 55%)" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="hsl(38 30% 55%)" strokeWidth="0.6" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="hsl(38 30% 55%)" strokeWidth="0.6" />

      {/* Orbiting words */}
      <text fontFamily="var(--font-inter), Inter, system-ui, sans-serif" fontSize="10" letterSpacing="6" fill="hsl(216 65% 12%)" fontWeight="500">
        <textPath href="#seal-arc-top" startOffset="0">
          {ringText.repeat(2)}
        </textPath>
      </text>
      <text fontFamily="var(--font-inter), Inter, system-ui, sans-serif" fontSize="8" letterSpacing="6" fill="hsl(216 65% 12%)" fontWeight="500">
        <textPath href="#seal-arc-bottom" startOffset="50%" textAnchor="middle">
          TRUST · BY · DESIGN
        </textPath>
      </text>

      {/* AR monogram */}
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontFamily="var(--font-serif-display), Fraunces, Georgia, serif"
        fontSize="64"
        fontWeight="600"
        fill="hsl(216 65% 12%)"
      >
        AR
      </text>
      {/* Diplomatic teal accent dot — echoes the crest's node graph */}
      <circle cx="138" cy="80" r="3.2" fill="hsl(183 78% 35%)" />
    </svg>
  );
}
