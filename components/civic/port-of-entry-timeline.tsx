import { Check, X, AlertTriangle, ShieldAlert } from "lucide-react";
import type { ScanCheckResult, ScannerFinding } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  passport: "Passport",
  mandate: "Mandate",
  visa: "Visa",
  baggage: "Baggage scan",
  injection: "Prompt injection",
  unsafe: "Unsafe code",
};

interface Stage {
  key: keyof typeof STAGE_LABELS;
  result: ScanCheckResult;
}

export function PortOfEntryTimeline({ stages }: { stages: Stage[] }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-serif text-base font-semibold tracking-tight">
        Port of Entry checkpoints
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Every representative agent must pass identity, mandate, baggage, and
        safety checks before entering a shared institution.
      </p>
      <ol className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stages.map((stage, i) => (
          <CheckpointPill
            key={stage.key}
            index={i}
            label={STAGE_LABELS[stage.key]}
            result={stage.result}
          />
        ))}
      </ol>
    </div>
  );
}

function CheckpointPill({
  index,
  label,
  result,
}: {
  index: number;
  label: string;
  result: ScanCheckResult;
}) {
  const passed = result.passed;
  const findingCount = result.findings.length;
  const severeCount = result.findings.filter(
    (f) => f.severity === "high" || f.severity === "critical",
  ).length;
  const Icon = passed ? Check : severeCount > 0 ? ShieldAlert : AlertTriangle;
  const tone = passed
    ? "border-civic-ok/40 bg-civic-ok/5 text-civic-ok"
    : severeCount > 0
      ? "border-civic-danger/40 bg-civic-danger/5 text-civic-danger"
      : "border-civic-warn/40 bg-civic-warn/5 text-civic-warn";
  return (
    <li className={cn("rounded-md border p-3", tone)}>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest opacity-70">
        <span>Stage {String(index + 1).padStart(2, "0")}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-2 font-serif text-sm font-semibold tracking-tight">
        {label}
      </div>
      <div className="mt-1 text-[11px] opacity-80">
        {passed
          ? "Pass"
          : findingCount > 0
            ? `${findingCount} finding${findingCount === 1 ? "" : "s"}`
            : "Flag"}
      </div>
    </li>
  );
}

export function ScanResultCard({
  title,
  result,
}: {
  title: string;
  result: ScanCheckResult;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          {result.passed ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-civic-ok">
              <Check className="h-3 w-3" /> Pass
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-civic-danger">
              <X className="h-3 w-3" /> Flagged
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {result.notes ? (
          <p className="mb-3 text-xs text-muted-foreground">{result.notes}</p>
        ) : null}
        {result.findings.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No findings on this stage.
          </p>
        ) : (
          <ul className="space-y-2">
            {result.findings.map((f, i) => (
              <FindingRow key={i} finding={f} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FindingRow({ finding }: { finding: ScannerFinding }) {
  const severityStyles: Record<ScannerFinding["severity"], string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-civic-warn/15 text-civic-warn",
    high: "bg-civic-danger/15 text-civic-danger",
    critical: "bg-civic-danger/20 text-civic-danger",
  };
  return (
    <li className="rounded border border-border bg-background p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-medium">{finding.type}</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            severityStyles[finding.severity],
          )}
        >
          {finding.severity}
        </span>
      </div>
      {finding.match ? (
        <div className="mt-1 truncate font-mono text-[11px]">
          match: <span className="text-foreground">{finding.match}</span>
        </div>
      ) : null}
      {finding.detail ? (
        <div className="mt-1 text-[11px] text-muted-foreground">
          {finding.detail}
        </div>
      ) : null}
    </li>
  );
}
