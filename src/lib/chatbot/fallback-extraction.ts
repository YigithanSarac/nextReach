import type { ChatStep } from "@/lib/domain/chat";
import type { AiExtractionResult, LeadDraft, LeadIntent, LeadUrgency } from "@/lib/domain/lead";

export type FallbackExtractionContext = {
  currentStep: ChatStep;
  message: string;
  previousMessages?: string[];
};

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const WEBSITE_PATTERN =
  /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:\/[^\s]*)?)\b/i;

const REFUSAL_KEYWORDS = [
  "dont want",
  "do not want",
  "prefer not",
  "rather not",
  "skip",
  "no thanks",
  "not share",
  "paylasmak istemiyorum",
  "paylasmak istemem",
  "cevaplamak istemiyorum",
  "yanitlamak istemiyorum",
  "istemiyorum",
];

const MEANINGLESS_PATTERNS = [
  /^[\W_]+$/,
  /^[a-z]{1,2}$/i,
  /^\d{1,4}$/,
  /^(asdf|qwer|test|deneme|blah|lol|haha)+$/i,
];

const PLATFORM_KEYWORDS: Array<[string, string]> = [
  ["shopify", "Shopify"],
  ["woocommerce", "WooCommerce"],
  ["magento", "Magento"],
  ["bigcommerce", "BigCommerce"],
  ["ikas", "ikas"],
  ["ticimax", "Ticimax"],
  ["custom", "Custom"],
];

export function extractWithFallback({
  currentStep,
  message,
  previousMessages = [],
}: FallbackExtractionContext): AiExtractionResult {
  const normalized = normalize(message);
  const extracted: LeadDraft = {};

  const email = extractEmail(message);
  if (email) {
    extracted.email = email;
  }

  const website = extractWebsite(message, email);
  if (website) {
    extracted.website = website;
  }

  const intent = extractIntent(normalized);
  if (intent) {
    extracted.intent = intent;
  }

  const urgency = extractUrgency(normalized);
  if (urgency) {
    extracted.urgency = urgency;
  }

  const platform = extractPlatform(normalized);
  if (platform) {
    extracted.platform = platform;
  }

  const refusalDetected = includesAny(normalized, REFUSAL_KEYWORDS);

  const name =
    !refusalDetected && currentStep === "CONTACT_INFO"
      ? extractPossibleName(message, email)
      : null;
  if (name) {
    extracted.name = name;
  }

  const company =
    !refusalDetected && currentStep === "COMPANY_CONTEXT"
      ? extractCompany(message, website)
      : null;
  if (company) {
    extracted.company = company;
  }

  const isMeaningless = detectMeaningless(normalized, message);
  const repeatedMessage = previousMessages
    .slice(-3)
    .map(normalize)
    .filter(Boolean)
    .includes(normalized);

  if (shouldUseMessageAsNeedSummary(currentStep, message, isMeaningless, refusalDetected)) {
    extracted.needSummary = compact(message);
  }

  const spamLikelihood = estimateSpamLikelihood({
    normalized,
    message,
    repeatedMessage,
    isMeaningless,
  });

  return {
    extracted,
    refusalDetected,
    topicShiftDetected: detectTopicShift(currentStep, extracted),
    isMeaningless,
    spamLikelihood,
    confidence: estimateConfidence(extracted, {
      refusalDetected,
      isMeaningless,
      spamLikelihood,
    }),
  };
}

export function extractEmail(message: string) {
  return message.match(EMAIL_PATTERN)?.[0] ?? null;
}

export function extractWebsite(message: string, email?: string | null) {
  const withoutEmail = email ? message.replace(email, " ") : message;
  const match = withoutEmail.match(WEBSITE_PATTERN)?.[1];

  if (!match || match.includes("@")) {
    return null;
  }

  if (match.toLowerCase().includes("supabase.co")) {
    return match;
  }

  return match.replace(/[),.;]+$/, "");
}

export function extractIntent(normalized: string): LeadIntent | null {
  if (includesAny(normalized, ["price", "pricing", "cost", "quote", "plan", "fiyat", "ucret"])) {
    return "pricing";
  }

  if (includesAny(normalized, ["demo", "walkthrough", "trial", "goster", "gorme"])) {
    return "demo";
  }

  if (
    includesAny(normalized, [
      "integration",
      "integrate",
      "api",
      "shopify",
      "woocommerce",
      "magento",
      "entegrasyon",
    ])
  ) {
    return "integration";
  }

  if (includesAny(normalized, ["question", "info", "learn", "general", "bilgi", "soru"])) {
    return "general";
  }

  return null;
}

export function extractUrgency(normalized: string): LeadUrgency | null {
  if (includesAny(normalized, ["asap", "urgent", "immediately", "today", "now", "hemen", "acil"])) {
    return "immediate";
  }

  if (
    includesAny(normalized, [
      "this week",
      "this month",
      "soon",
      "bu hafta",
      "bu ay",
      "yakinda",
    ])
  ) {
    return "this_month";
  }

  if (includesAny(normalized, ["later", "next quarter", "not now", "ileride", "sonra"])) {
    return "later";
  }

  if (includesAny(normalized, ["research", "exploring", "just looking", "arastir", "bakiyorum"])) {
    return "researching";
  }

  return null;
}

function extractPlatform(normalized: string) {
  return PLATFORM_KEYWORDS.find(([keyword]) => normalized.includes(keyword))?.[1] ?? null;
}

function extractCompany(message: string, website: string | null) {
  const trimmed = compact(message);

  if (!trimmed || trimmed.length > 120 || trimmed.includes("@")) {
    return null;
  }

  if (website && normalize(trimmed) === normalize(website)) {
    return null;
  }

  if (WEBSITE_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function extractPossibleName(message: string, email: string | null) {
  const withoutEmail = email ? message.replace(email, " ") : message;
  const cleaned = compact(withoutEmail)
    .replace(/\b(my name is|i am|i'm|benim adim|adim)\b/gi, "")
    .trim();

  if (!cleaned || cleaned.length > 80 || /\d/.test(cleaned)) {
    return null;
  }

  const wordCount = cleaned.split(/\s+/).length;
  return wordCount <= 4 ? cleaned : null;
}

function shouldUseMessageAsNeedSummary(
  currentStep: ChatStep,
  message: string,
  isMeaningless: boolean,
  refusalDetected: boolean
) {
  if (currentStep !== "NEED_DETAILS" && currentStep !== "INTENT") {
    return false;
  }

  const trimmed = compact(message);
  return !isMeaningless && !refusalDetected && trimmed.length >= 12;
}

function detectMeaningless(normalized: string, original: string) {
  if (!normalized) {
    return true;
  }

  if (MEANINGLESS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const letters = original.replace(/[^a-zA-Z]/g, "");
  const uniqueLetters = new Set(letters.toLowerCase()).size;
  return letters.length >= 8 && uniqueLetters <= 2;
}

function detectTopicShift(currentStep: ChatStep, extracted: LeadDraft) {
  if (currentStep === "INTENT" || currentStep === "GREETING") {
    return false;
  }

  return Boolean(extracted.intent);
}

function estimateSpamLikelihood({
  normalized,
  message,
  repeatedMessage,
  isMeaningless,
}: {
  normalized: string;
  message: string;
  repeatedMessage: boolean;
  isMeaningless: boolean;
}) {
  let score = 0;

  if (repeatedMessage) {
    score += 0.35;
  }

  if (isMeaningless) {
    score += 0.35;
  }

  if ((message.match(/https?:\/\//gi) ?? []).length > 2) {
    score += 0.3;
  }

  if (includesAny(normalized, ["crypto", "casino", "viagra", "loan", "free money"])) {
    score += 0.4;
  }

  return Math.min(1, Number(score.toFixed(2)));
}

function estimateConfidence(
  extracted: LeadDraft,
  signals: {
    refusalDetected: boolean;
    isMeaningless: boolean;
    spamLikelihood: number;
  }
) {
  if (signals.isMeaningless) {
    return 0.1;
  }

  let confidence = 0.25;

  if (Object.keys(extracted).length > 0) {
    confidence += 0.4;
  }

  if (signals.refusalDetected) {
    confidence += 0.25;
  }

  confidence -= signals.spamLikelihood * 0.3;

  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.@:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}
