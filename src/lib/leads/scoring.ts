import type {
  AiExtractionResult,
  LeadDraft,
  LeadIntent,
  LeadQuality,
  LeadUrgency,
  ScoringBreakdown,
} from "@/lib/domain/lead";

export type LeadScoringInput = {
  fields: LeadDraft;
  extraction?: Pick<AiExtractionResult, "confidence" | "spamLikelihood">;
};

export type LeadScoringResult = {
  score: number;
  quality: LeadQuality;
  breakdown: ScoringBreakdown;
  missingFields: string[];
};

const BUSINESS_EMAIL_BLOCKLIST = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
  "yandex.com",
]);

export function scoreLead({ fields, extraction }: LeadScoringInput): LeadScoringResult {
  const breakdown: ScoringBreakdown = {
    businessEmail: scoreBusinessEmail(fields.email),
    companyProvided: scoreCompanyContext(fields),
    clearIntent: scoreIntent(fields.intent),
    needSummaryProvided: scoreNeedSummary(fields.needSummary),
    urgentTimeline: scoreUrgency(fields.urgency),
    missingContactPenalty: fields.email ? 0 : -2,
    lowConfidencePenalty:
      extraction && extraction.confidence < 0.45 && !hasMinimumUsefulFields(fields)
        ? -1
        : 0,
    spamPenalty: scoreSpamPenalty(fields, extraction?.spamLikelihood ?? 0),
  };

  const rawScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const score = clamp(rawScore, 0, 10);

  return {
    score,
    quality: qualityFromScore(score),
    breakdown,
    missingFields: getMissingFields(fields),
  };
}

export function qualityFromScore(score: number): LeadQuality {
  if (score >= 6) {
    return "high";
  }

  if (score >= 3) {
    return "medium";
  }

  return "low";
}

export function buildDeterministicLeadSummary(fields: LeadDraft) {
  const company = fields.company ?? fields.website ?? "Unknown company";
  const intent = labelIntent(fields.intent);
  const urgency = labelUrgency(fields.urgency);
  const need = fields.needSummary ?? "Need was not clearly provided.";
  const contact = fields.email ? `Contact: ${fields.email}.` : "No contact email provided.";

  return `${company} reached out about ${intent}. Urgency: ${urgency}. ${need} ${contact}`;
}

function scoreBusinessEmail(email?: string | null) {
  if (!email) {
    return 0;
  }

  return isBusinessEmail(email) ? 2 : 1;
}

function scoreCompanyContext(fields: LeadDraft) {
  return fields.company || fields.website ? 2 : 0;
}

function scoreIntent(intent?: LeadIntent | null) {
  if (!intent || intent === "unknown") {
    return 0;
  }

  if (intent === "pricing" || intent === "demo" || intent === "integration") {
    return 2;
  }

  return 1;
}

function scoreNeedSummary(needSummary?: string | null) {
  if (!needSummary) {
    return 0;
  }

  return needSummary.trim().length >= 20 ? 2 : 1;
}

function scoreUrgency(urgency?: LeadUrgency | null) {
  if (urgency === "immediate" || urgency === "this_month") {
    return 1;
  }

  return 0;
}

function scoreSpamPenalty(fields: LeadDraft, spamLikelihood: number) {
  const hasSpamFlags = (fields.spamFlags ?? []).length > 0;

  if (spamLikelihood >= 0.8 || hasSpamFlags) {
    return -4;
  }

  if (spamLikelihood >= 0.6) {
    return -2;
  }

  return 0;
}

function getMissingFields(fields: LeadDraft) {
  const missing: string[] = [];

  if (!fields.intent || fields.intent === "unknown") {
    missing.push("intent");
  }

  if (!fields.needSummary) {
    missing.push("needSummary");
  }

  if (!fields.email) {
    missing.push("email");
  }

  if (!fields.company && !fields.website) {
    missing.push("companyOrWebsite");
  }

  if (!fields.urgency || fields.urgency === "unknown") {
    missing.push("urgency");
  }

  return Array.from(new Set([...(fields.missingFields ?? []), ...missing]));
}

function hasMinimumUsefulFields(fields: LeadDraft) {
  return Boolean(fields.intent || fields.needSummary || fields.email || fields.company || fields.website);
}

function isBusinessEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && !BUSINESS_EMAIL_BLOCKLIST.has(domain));
}

function labelIntent(intent?: LeadIntent | null) {
  if (!intent || intent === "unknown") {
    return "an unspecified request";
  }

  return intent;
}

function labelUrgency(urgency?: LeadUrgency | null) {
  if (!urgency || urgency === "unknown") {
    return "unknown";
  }

  return urgency.replace("_", " ");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
