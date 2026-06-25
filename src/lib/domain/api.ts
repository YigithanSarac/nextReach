import type { ChatFlag, ChatMessage, ChatSession, ChatStep } from "./chat";
import type { Lead, LeadDraft, LeadQuality, LeadStatus } from "./lead";

export type ApiErrorCode =
  | "AI_UNAVAILABLE"
  | "BUSINESS_RULE_FAILED"
  | "INTERNAL_ERROR"
  | "LEAD_NOT_FOUND"
  | "LEADS_FETCH_FAILED"
  | "RATE_LIMITED"
  | "SESSION_ALREADY_COMPLETED"
  | "SESSION_CREATE_FAILED"
  | "SESSION_NOT_FOUND"
  | "VALIDATION_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type CreateChatSessionRequest = {
  source?: string;
  metadata?: Record<string, unknown>;
};

export type CreateChatSessionResponse = {
  sessionId: string;
  currentStep: ChatStep;
  botMessage: string;
};

export type SendChatMessageRequest = {
  sessionId: string;
  message: string;
  clientStep?: ChatStep;
};

export type SendChatMessageResponse = {
  sessionId: string;
  previousStep: ChatStep;
  nextStep: ChatStep;
  botMessage: string;
  collectedFields: LeadDraft;
  flags: ChatFlag[];
  isComplete: boolean;
  leadId?: string;
};

export type GetChatSessionResponse = Pick<
  ChatSession,
  "id" | "status" | "currentStep" | "collectedFields"
> & {
  messages: Array<Pick<ChatMessage, "sender" | "content" | "step" | "createdAt">>;
};

export type AdminLeadListQuery = {
  status?: LeadStatus;
  quality?: LeadQuality;
  intent?: string;
  search?: string;
  limit?: number;
  cursor?: string;
};

export type AdminLeadListItem = Pick<
  Lead,
  | "id"
  | "createdAt"
  | "status"
  | "quality"
  | "score"
  | "intent"
  | "urgency"
  | "company"
  | "name"
  | "email"
  | "leadSummary"
>;

export type AdminLeadListResponse = {
  items: AdminLeadListItem[];
  nextCursor: string | null;
};

export type AdminLeadDetailResponse = Lead & {
  messages: Array<
    Pick<
      ChatMessage,
      | "sender"
      | "step"
      | "content"
      | "createdAt"
      | "aiExtraction"
      | "aiConfidence"
      | "extractionStatus"
      | "flags"
    >
  >;
};

export type UpdateLeadRequest = {
  status?: LeadStatus;
  notes?: string | null;
};

export type UpdateLeadResponse = Pick<
  Lead,
  "id" | "status" | "updatedAt" | "notes"
>;
