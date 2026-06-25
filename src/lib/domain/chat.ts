export const CHAT_STEPS = [
  "GREETING",
  "INTENT",
  "COMPANY_CONTEXT",
  "NEED_DETAILS",
  "URGENCY",
  "CONTACT_INFO",
  "CONFIRMATION",
  "COMPLETE",
  "FALLBACK_REPAIR",
  "SPAM_GUARD",
] as const;

export type ChatStep = (typeof CHAT_STEPS)[number];

export const CHAT_SESSION_STATUSES = [
  "active",
  "completed",
  "abandoned",
  "spam_blocked",
] as const;

export type ChatSessionStatus = (typeof CHAT_SESSION_STATUSES)[number];

export const MESSAGE_SENDERS = ["user", "bot", "system"] as const;

export type MessageSender = (typeof MESSAGE_SENDERS)[number];

export const EXTRACTION_STATUSES = [
  "not_requested",
  "completed",
  "fallback_used",
  "failed",
] as const;

export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

export type ChatFlag =
  | "ai_extraction_failed"
  | "ai_summary_failed"
  | "clarification_requested"
  | "company_skipped"
  | "deterministic_summary_used"
  | "fallback_used"
  | "invalid_email"
  | "low_confidence"
  | "meaningless_answer"
  | "missing_contact"
  | "rate_limit_warning"
  | "repeated_message"
  | "spam_suspected"
  | "topic_shift_detected";

export type ChatSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  currentStep: ChatStep;
  status: ChatSessionStatus;
  visitorFingerprint: string | null;
  messageCount: number;
  spamScore: number;
  spamFlags: ChatFlag[];
  collectedFields: LeadDraft;
  metadata: Record<string, unknown>;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  createdAt: string;
  sender: MessageSender;
  step: ChatStep;
  content: string;
  aiExtraction: AiExtractionResult | null;
  aiConfidence: number | null;
  extractionStatus: ExtractionStatus;
  flags: ChatFlag[];
};

import type { AiExtractionResult, LeadDraft } from "./lead";
