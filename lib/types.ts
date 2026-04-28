// Centralized domain types. These mirror the database schema exactly.
// Keep this file as the single source of truth so service layers can
// import the same shapes the UI consumes.

export type VisaClass =
  | "visitor"
  | "representative"
  | "committee"
  | "consortium"
  | "diplomatic"
  | "quarantine";

export type RepresentativeStatus = "active" | "suspended" | "revoked";

export type PassportRevocationStatus = "valid" | "revoked" | "expired";

export type PacketType =
  | "failure_pattern"
  | "request_for_counsel"
  | "proposed_standard"
  | "warning_bulletin"
  | "tool_evaluation";

export type PacketStatus =
  | "draft"
  | "scanning"
  | "admitted"
  | "rejected"
  | "quarantined"
  | "published"
  | "archived";

export type ScanStatus = "pending" | "clean" | "flagged" | "quarantined";

export type QuarantineStatus =
  | "none"
  | "open"
  | "under_review"
  | "cleaned_and_resubmitted"
  | "rejected"
  | "released";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AdmissionDecision =
  | "admit"
  | "reject"
  | "quarantine"
  | "needs_human_review";

export type ResponseType =
  | "advice"
  | "pattern"
  | "standard_suggestion"
  | "warning"
  | "clarification_question"
  | "evidence_report";

export type ProposedChangeType =
  | "educational_summary"
  | "local_memory_note"
  | "agent_instruction_change"
  | "tool_installation"
  | "code_change"
  | "destructive_action";

export type RatificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_changes"
  | "implemented"
  | "archived";

export type KnowledgeType =
  | "accepted_pattern"
  | "rejected_pattern"
  | "warning"
  | "local_policy"
  | "instruction_note"
  | "tool_note";

export type Sensitivity = "public" | "generalized" | "redacted" | "restricted";

// ---------- Entities ----------

export interface Station {
  id: string;
  owner_user_id: string | null;
  name: string;
  description: string;
  station_type: string;
  allowed_share_categories: string[];
  prohibited_share_categories: string[];
  participation_mode: ParticipationMode;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export type ParticipationMode = "ask" | "answer" | "both";
export type ApprovalStatus = "pending" | "active" | "rejected" | "suspended";

export interface Representative {
  id: string;
  station_id: string;
  name: string;
  role: string;
  domain_focus: string[];
  visa_class: VisaClass;
  status: RepresentativeStatus;
  trust_score_default: number;
  created_at: string;
  updated_at: string;
}

export interface Mandate {
  id: string;
  station_id: string;
  representative_id: string | null;
  version: number;
  may_observe: string[];
  may_share: string[];
  may_request: string[];
  may_not_share: string[];
  may_adopt_without_approval: string[];
  requires_approval: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Passport {
  id: string;
  representative_id: string;
  station_id: string;
  issuer: string;
  role: string;
  station_type: string;
  allowed_domains: string[];
  visa_class: VisaClass;
  mandate_hash: string;
  valid_from: string;
  valid_until: string;
  revocation_status: PassportRevocationStatus;
  signature_mock: string;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  description: string;
  access_level: string;
  created_at: string;
  updated_at: string;
}

export interface Committee {
  id: string;
  institution_id: string;
  name: string;
  description: string;
  domain: string;
  access_level: string;
  created_at: string;
  updated_at: string;
}

export interface CivicPacketBody {
  symptoms?: string[];
  hypothesized_cause?: string;
  evidence?: Record<string, unknown>;
  request?: string;
  // Free-form additional content. The scanner walks every string in the body.
  [key: string]: unknown;
}

export interface CivicPacket {
  id: string;
  packet_type: PacketType;
  title: string;
  summary: string;
  domain: string;
  institution_id: string | null;
  committee_id: string | null;
  originating_station_id: string;
  representative_id: string;
  sensitivity: Sensitivity;
  evidence_class: string;
  confidence_score: number;
  body: CivicPacketBody;
  status: PacketStatus;
  scan_status: ScanStatus;
  quarantine_status: QuarantineStatus;
  share_scope: string;
  created_at: string;
  updated_at: string;
}

export interface ScannerFinding {
  type: string;
  match: string;
  severity: "low" | "medium" | "high" | "critical";
  category:
    | "secret"
    | "pii"
    | "source_code"
    | "prompt_injection"
    | "unsafe_code"
    | "policy"
    | "mandate";
  detail?: string;
}

export interface ScanCheckResult {
  passed: boolean;
  findings: ScannerFinding[];
  notes?: string;
}

export interface BaggageScan {
  id: string;
  packet_id: string;
  representative_id: string | null;
  passport_id: string | null;
  passport_result: ScanCheckResult;
  mandate_result: ScanCheckResult;
  visa_result: ScanCheckResult;
  sensitive_data_result: ScanCheckResult;
  prompt_injection_result: ScanCheckResult;
  malware_heuristic_result: ScanCheckResult;
  risk_score: number;
  risk_level: RiskLevel;
  decision: AdmissionDecision;
  explanation: string;
  created_at: string;
}

export interface QuarantineCase {
  id: string;
  packet_id: string;
  scan_id: string | null;
  reason: string;
  status: QuarantineStatus;
  assigned_reviewer_id: string | null;
  resolution: string | null;
  cleaned_packet_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PacketResponse {
  id: string;
  packet_id: string;
  representative_id: string;
  response_type: ResponseType;
  summary: string;
  proposed_pattern: string | null;
  evidence: Record<string, unknown>;
  risks: string[];
  implementation_steps: string[];
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface RatificationRequest {
  id: string;
  station_id: string;
  packet_id: string | null;
  response_id: string | null;
  title: string;
  recommendation_summary: string;
  proposed_change_type: ProposedChangeType;
  risk_level: RiskLevel;
  approval_required: string;
  status: RatificationStatus;
  reviewer_id: string | null;
  decision: string | null;
  decision_notes: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface StationKnowledgeItem {
  id: string;
  station_id: string;
  title: string;
  summary: string;
  source_packet_id: string | null;
  source_response_id: string | null;
  knowledge_type: KnowledgeType;
  status: "active" | "superseded" | "retired";
  adopted_at: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustScore {
  id: string;
  representative_id: string;
  domain: string;
  score: number;
  evidence_count: number;
  last_updated: string;
}

export type AuditEventType =
  | "station_created"
  | "representative_created"
  | "mandate_created"
  | "mandate_updated"
  | "passport_issued"
  | "passport_revoked"
  | "civic_packet_created"
  | "civic_packet_scanned"
  | "civic_packet_admitted"
  | "civic_packet_quarantined"
  | "civic_packet_rejected"
  | "civic_packet_published"
  | "response_created"
  | "ratification_requested"
  | "ratification_approved"
  | "ratification_rejected"
  | "knowledge_item_created"
  | "visa_changed"
  | "trust_score_changed";

export interface AuditLog {
  id: string;
  event_type: AuditEventType | string;
  actor_user_id: string | null;
  actor_representative_id: string | null;
  station_id: string | null;
  representative_id: string | null;
  packet_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
