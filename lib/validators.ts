// Zod schemas. These power form validation, API input parsing, and the
// fallback (deterministic) AI-generated packet drafts. Keep them aligned
// with the SQL constraints in supabase/migrations/*.

import { z } from "zod";

export const visaClassSchema = z.enum([
  "visitor",
  "representative",
  "committee",
  "consortium",
  "diplomatic",
  "quarantine",
]);

export const packetTypeSchema = z.enum([
  "failure_pattern",
  "request_for_counsel",
  "proposed_standard",
  "warning_bulletin",
  "tool_evaluation",
]);

export const responseTypeSchema = z.enum([
  "advice",
  "pattern",
  "standard_suggestion",
  "warning",
  "clarification_question",
  "evidence_report",
]);

export const proposedChangeTypeSchema = z.enum([
  "educational_summary",
  "local_memory_note",
  "agent_instruction_change",
  "tool_installation",
  "code_change",
  "destructive_action",
]);

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const stationCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default(""),
  station_type: z.string().default("software_repository"),
  allowed_share_categories: z.array(z.string()).default([]),
  prohibited_share_categories: z.array(z.string()).default([]),
});

export const representativeCreateSchema = z.object({
  station_id: z.string().uuid(),
  name: z.string().min(2).max(120),
  role: z.string().default("station_representative"),
  domain_focus: z.array(z.string()).default([]),
  visa_class: visaClassSchema.default("representative"),
});

export const mandateUpsertSchema = z.object({
  station_id: z.string().uuid(),
  representative_id: z.string().uuid().nullable().optional(),
  may_observe: z.array(z.string()).default([]),
  may_share: z.array(z.string()).default([]),
  may_request: z.array(z.string()).default([]),
  may_not_share: z.array(z.string()).default([]),
  may_adopt_without_approval: z.array(z.string()).default([]),
  requires_approval: z.array(z.string()).default([]),
});

export const packetBodySchema = z
  .object({
    symptoms: z.array(z.string()).optional(),
    hypothesized_cause: z.string().optional(),
    evidence: z.record(z.unknown()).optional(),
    request: z.string().optional(),
  })
  .passthrough();

export const packetCreateSchema = z.object({
  packet_type: packetTypeSchema,
  title: z.string().min(4).max(160),
  summary: z.string().max(3000).default(""),
  domain: z.string().default(""),
  committee_id: z.string().uuid().nullable().optional(),
  originating_station_id: z.string().uuid(),
  representative_id: z.string().uuid(),
  sensitivity: z
    .enum(["public", "generalized", "redacted", "restricted"])
    .default("generalized"),
  evidence_class: z.string().default("observational"),
  confidence_score: z.number().min(0).max(1).default(0.6),
  body: packetBodySchema.default({}),
});

export const responseCreateSchema = z.object({
  packet_id: z.string().uuid(),
  representative_id: z.string().uuid(),
  response_type: responseTypeSchema,
  summary: z.string().min(2),
  proposed_pattern: z.string().nullable().optional(),
  evidence: z.record(z.unknown()).default({}),
  risks: z.array(z.string()).default([]),
  implementation_steps: z.array(z.string()).default([]),
  confidence_score: z.number().min(0).max(1).default(0.7),
});

export const ratificationRequestCreateSchema = z.object({
  station_id: z.string().uuid(),
  packet_id: z.string().uuid().nullable().optional(),
  response_id: z.string().uuid().nullable().optional(),
  title: z.string().min(4),
  recommendation_summary: z.string().min(4),
  proposed_change_type: proposedChangeTypeSchema,
  risk_level: riskLevelSchema.default("low"),
  approval_required: z.string().default("human_required"),
});

export type StationCreateInput = z.infer<typeof stationCreateSchema>;
export type RepresentativeCreateInput = z.infer<typeof representativeCreateSchema>;
export type MandateUpsertInput = z.infer<typeof mandateUpsertSchema>;
export type PacketCreateInput = z.infer<typeof packetCreateSchema>;
export type ResponseCreateInput = z.infer<typeof responseCreateSchema>;
export type RatificationRequestCreateInput = z.infer<
  typeof ratificationRequestCreateSchema
>;
