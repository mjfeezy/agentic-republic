import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  PacketStatus,
  RatificationStatus,
  RiskLevel,
  VisaClass,
  AdmissionDecision,
  PassportRevocationStatus,
  KnowledgeType,
} from "@/lib/types";

interface DotProps {
  color: string;
}
function Dot({ color }: DotProps) {
  return <span className="status-dot" style={{ backgroundColor: color }} />;
}

const STATUS_MAP: Record<
  PacketStatus,
  { label: string; variant: Parameters<typeof Badge>[0]["variant"]; color: string }
> = {
  draft: { label: "Draft", variant: "muted", color: "hsl(220 12% 60%)" },
  scanning: { label: "Scanning", variant: "warn", color: "hsl(36 96% 45%)" },
  admitted: { label: "Admitted", variant: "ok", color: "hsl(152 56% 32%)" },
  rejected: { label: "Rejected", variant: "danger", color: "hsl(0 72% 45%)" },
  quarantined: { label: "Quarantined", variant: "danger", color: "hsl(0 72% 45%)" },
  published: { label: "Published", variant: "ok", color: "hsl(152 56% 32%)" },
  archived: { label: "Archived", variant: "muted", color: "hsl(220 12% 60%)" },
};

export function PacketStatusBadge({ status }: { status: PacketStatus }) {
  const meta = STATUS_MAP[status];
  return (
    <Badge variant={meta.variant} className="font-medium">
      <Dot color={meta.color} />
      {meta.label}
    </Badge>
  );
}

const RATIFICATION_MAP: Record<
  RatificationStatus,
  { label: string; variant: Parameters<typeof Badge>[0]["variant"] }
> = {
  pending: { label: "Pending", variant: "warn" },
  approved: { label: "Approved", variant: "ok" },
  rejected: { label: "Rejected", variant: "danger" },
  needs_changes: { label: "Needs changes", variant: "warn" },
  implemented: { label: "Implemented", variant: "seal" },
  archived: { label: "Archived", variant: "muted" },
};
export function RatificationStatusBadge({
  status,
}: {
  status: RatificationStatus;
}) {
  const meta = RATIFICATION_MAP[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const RISK_MAP: Record<
  RiskLevel,
  { label: string; variant: Parameters<typeof Badge>[0]["variant"] }
> = {
  low: { label: "Low risk", variant: "ok" },
  medium: { label: "Medium risk", variant: "warn" },
  high: { label: "High risk", variant: "danger" },
  critical: { label: "Critical risk", variant: "danger" },
};
export function RiskBadge({ level }: { level: RiskLevel }) {
  const meta = RISK_MAP[level];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const VISA_MAP: Record<VisaClass, { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  visitor: { label: "Visitor", variant: "muted" },
  representative: { label: "Representative", variant: "seal" },
  committee: { label: "Committee", variant: "seal" },
  consortium: { label: "Consortium", variant: "ok" },
  diplomatic: { label: "Diplomatic", variant: "ok" },
  quarantine: { label: "Quarantine", variant: "danger" },
};
export function VisaBadge({ visa }: { visa: VisaClass }) {
  const meta = VISA_MAP[visa];
  return <Badge variant={meta.variant}>{meta.label} visa</Badge>;
}

export function AdmissionDecisionBadge({ decision }: { decision: AdmissionDecision }) {
  const map: Record<AdmissionDecision, Parameters<typeof Badge>[0]["variant"]> = {
    admit: "ok",
    reject: "danger",
    quarantine: "danger",
    needs_human_review: "warn",
  };
  const labels: Record<AdmissionDecision, string> = {
    admit: "Admitted",
    reject: "Rejected",
    quarantine: "Quarantined",
    needs_human_review: "Needs human review",
  };
  return <Badge variant={map[decision]}>{labels[decision]}</Badge>;
}

export function PassportStatusBadge({ status }: { status: PassportRevocationStatus }) {
  if (status === "valid") return <Badge variant="ok">Valid</Badge>;
  if (status === "revoked") return <Badge variant="danger">Revoked</Badge>;
  return <Badge variant="muted">Expired</Badge>;
}

export function KnowledgeTypeBadge({ type }: { type: KnowledgeType }) {
  const map: Record<KnowledgeType, { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
    accepted_pattern: { label: "Accepted pattern", variant: "ok" },
    rejected_pattern: { label: "Rejected pattern", variant: "danger" },
    warning: { label: "Warning", variant: "warn" },
    local_policy: { label: "Local policy", variant: "seal" },
    instruction_note: { label: "Instruction note", variant: "secondary" },
    tool_note: { label: "Tool note", variant: "secondary" },
  };
  const meta = map[type];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function TrustScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let variant: Parameters<typeof Badge>[0]["variant"] = "muted";
  if (score >= 0.8) variant = "ok";
  else if (score >= 0.6) variant = "seal";
  else if (score >= 0.4) variant = "warn";
  else variant = "danger";
  return (
    <Badge variant={variant} className={cn("font-mono")}>
      {pct}%
    </Badge>
  );
}
