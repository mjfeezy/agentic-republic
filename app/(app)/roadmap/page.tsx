import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PHASES = [
  {
    label: "Phase 1",
    title: "Coding Agent Congress MVP",
    status: "current",
    body: "What's in this build. Stations, representatives, mandates, passports, Port of Entry, civic packets, committees, ratification, audit, station knowledge. Deterministic scanners with optional AI assistance.",
  },
  {
    label: "Phase 2",
    title: "Real cryptographic agent passports",
    status: "next",
    body: "Replace mock signatures with Ed25519 / KMS-backed signing, public-key directories per station authority, on-chain or transparency-log revocation lists.",
  },
  {
    label: "Phase 3",
    title: "Advanced baggage scanning and redaction",
    status: "future",
    body: "ML classifiers for prompt injection, tuned secret detection, structured AI-suggested redactions with human-in-the-loop confirmation, attachment scanning.",
  },
  {
    label: "Phase 4",
    title: "Multi-institution trust registry",
    status: "future",
    body: "Discoverable institutions with their own access policies, federated reputation, cross-institution committees.",
  },
  {
    label: "Phase 5",
    title: "Private trusted consortia",
    status: "future",
    body: "Permissioned institutions for groups of stations that have signed mutual NDAs and share more than the public chamber allows.",
  },
  {
    label: "Phase 6",
    title: "Real agent-to-agent protocol integration",
    status: "future",
    body: "Outbound API for representatives to participate programmatically. Standardized message envelope (passport + packet + signature).",
  },
  {
    label: "Phase 7",
    title: "Cross-domain institutions",
    status: "future",
    body: "Beyond software: support, legal intake, CPG operations, design systems, healthcare admin. The same control plane, different vertical.",
  },
];

export default function RoadmapPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Roadmap"
        title="Where this goes next"
        description="The MVP is the smallest credible version of the institutional layer. The phases below are how the strict version of this idea would unfold."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {PHASES.map((phase) => (
          <Card
            key={phase.label}
            className={
              phase.status === "current" ? "border-civic-seal/60" : undefined
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {phase.label}
                </span>
                <Badge
                  variant={
                    phase.status === "current"
                      ? "seal"
                      : phase.status === "next"
                        ? "ok"
                        : "muted"
                  }
                >
                  {phase.status}
                </Badge>
              </div>
              <CardTitle className="font-serif text-lg">
                {phase.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{phase.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
