import type {
  ChatMessage,
  ChatSession,
  ChatSessionStatus,
  ChatStep,
  ExtractionStatus,
  MessageSender,
} from "./chat";
import type {
  ExtractedFields,
  Lead,
  LeadIntent,
  LeadQuality,
  LeadStatus,
  LeadUrgency,
} from "./lead";

export type ChatSessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  current_step: ChatStep;
  status: ChatSessionStatus;
  visitor_fingerprint: string | null;
  message_count: number;
  spam_score: number;
  spam_flags: string[];
  collected_fields: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type ChatMessageRow = {
  id: string;
  session_id: string;
  created_at: string;
  sender: MessageSender;
  step: ChatStep;
  content: string;
  ai_extraction: Record<string, unknown> | null;
  ai_confidence: number | null;
  extraction_status: ExtractionStatus;
  flags: string[];
};

export type LeadRow = {
  id: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
  status: LeadStatus;
  quality: LeadQuality;
  score: number;
  intent: LeadIntent;
  urgency: LeadUrgency;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  platform: string | null;
  company_size: string | null;
  need_summary: string | null;
  lead_summary: string | null;
  missing_fields: string[];
  extracted_fields: ExtractedFields;
  ai_summary: Record<string, unknown>;
  scoring_breakdown: Record<string, unknown>;
  spam_flags: string[];
  source: string;
  notes: string | null;
};

export type Database = {
  public: {
    Tables: {
      chat_sessions: {
        Row: ChatSessionRow;
        Insert: Partial<Omit<ChatSessionRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<Omit<ChatSessionRow, "id" | "created_at">>;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: Partial<Omit<ChatMessageRow, "id" | "created_at">> &
          Pick<ChatMessageRow, "session_id" | "sender" | "step" | "content">;
        Update: Partial<Omit<ChatMessageRow, "id" | "created_at" | "session_id">>;
        Relationships: [];
      };
      leads: {
        Row: LeadRow;
        Insert: Partial<Omit<LeadRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<Omit<LeadRow, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function mapChatSessionRow(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    currentStep: row.current_step,
    status: row.status,
    visitorFingerprint: row.visitor_fingerprint,
    messageCount: row.message_count,
    spamScore: row.spam_score,
    spamFlags: row.spam_flags as ChatSession["spamFlags"],
    collectedFields: row.collected_fields,
    metadata: row.metadata,
  };
}

export function mapChatMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    sender: row.sender,
    step: row.step,
    content: row.content,
    aiExtraction: row.ai_extraction as ChatMessage["aiExtraction"],
    aiConfidence: row.ai_confidence,
    extractionStatus: row.extraction_status,
    flags: row.flags as ChatMessage["flags"],
  };
}

export function mapLeadRow(row: LeadRow): Lead {
  return {
    id: row.id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    quality: row.quality,
    score: row.score,
    intent: row.intent,
    urgency: row.urgency,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    website: row.website,
    platform: row.platform,
    companySize: row.company_size,
    needSummary: row.need_summary,
    leadSummary: row.lead_summary,
    missingFields: row.missing_fields,
    extractedFields: row.extracted_fields,
    aiSummary: row.ai_summary,
    scoringBreakdown: row.scoring_breakdown,
    spamFlags: row.spam_flags,
    source: row.source,
    notes: row.notes,
  };
}
