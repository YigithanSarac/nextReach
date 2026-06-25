export const LEAD_STATUSES = ["new", "reviewed", "archived", "spam"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_QUALITIES = ["low", "medium", "high"] as const;

export type LeadQuality = (typeof LEAD_QUALITIES)[number];

export const LEAD_INTENTS = [
  "pricing",
  "demo",
  "integration",
  "general",
  "other",
  "unknown",
] as const;

export type LeadIntent = (typeof LEAD_INTENTS)[number];

export const LEAD_URGENCIES = [
  "immediate",
  "this_month",
  "later",
  "researching",
  "unknown",
] as const;

export type LeadUrgency = (typeof LEAD_URGENCIES)[number];

export type ContactInfo = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type CompanyInfo = {
  company?: string | null;
  website?: string | null;
  platform?: string | null;
  companySize?: string | null;
};

export type LeadDraft = ContactInfo &
  CompanyInfo & {
    intent?: LeadIntent | null;
    urgency?: LeadUrgency | null;
    needSummary?: string | null;
    missingFields?: string[];
    spamFlags?: string[];
  };

export type ExtractedField<TValue> = {
  value: TValue;
  source: "ai" | "fallback" | "user_message" | "system";
  confidence: number | null;
};

export type ExtractedFields = Partial<{
  intent: ExtractedField<LeadIntent>;
  urgency: ExtractedField<LeadUrgency>;
  name: ExtractedField<string>;
  email: ExtractedField<string>;
  phone: ExtractedField<string>;
  company: ExtractedField<string>;
  website: ExtractedField<string>;
  platform: ExtractedField<string>;
  companySize: ExtractedField<string>;
  needSummary: ExtractedField<string>;
}>;

export type AiExtractionResult = {
  extracted: LeadDraft;
  refusalDetected: boolean;
  topicShiftDetected: boolean;
  isMeaningless: boolean;
  spamLikelihood: number;
  confidence: number;
};

export type ScoringBreakdown = {
  businessEmail: number;
  companyProvided: number;
  clearIntent: number;
  needSummaryProvided: number;
  urgentTimeline: number;
  missingContactPenalty: number;
  lowConfidencePenalty: number;
  spamPenalty: number;
};

export type Lead = {
  id: string;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
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
  companySize: string | null;
  needSummary: string | null;
  leadSummary: string | null;
  missingFields: string[];
  extractedFields: ExtractedFields;
  aiSummary: Record<string, unknown>;
  scoringBreakdown: Partial<ScoringBreakdown>;
  spamFlags: string[];
  source: string;
  notes: string | null;
};
