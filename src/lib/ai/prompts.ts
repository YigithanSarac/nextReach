import type { ChatStep } from "@/lib/domain/chat";
import type { LeadDraft } from "@/lib/domain/lead";

export function buildExtractionPrompt({
  currentStep,
  message,
  collectedFields,
}: {
  currentStep: ChatStep;
  message: string;
  collectedFields: LeadDraft;
}) {
  return [
    "You are an extraction service for a B2B SaaS landing page chatbot.",
    "Do not decide the next chatbot step. The application state machine handles the flow.",
    "Only extract structured fields from the user's latest message.",
    "",
    "Allowed intents: pricing, demo, integration, general, other, unknown.",
    "Allowed urgencies: immediate, this_month, later, researching, unknown.",
    "",
    `Current step: ${currentStep}`,
    `Previously collected fields: ${JSON.stringify(collectedFields)}`,
    `User message: ${message}`,
    "",
    "Return JSON only. Use null omission by simply leaving unknown extracted fields out.",
    "Set refusalDetected when the user refuses or wants to skip the requested answer.",
    "Set topicShiftDetected when the user answers a different sales topic than the current step asks for.",
    "Set isMeaningless for random, empty, or unusable content.",
    "Set spamLikelihood from 0 to 1.",
    "Set confidence from 0 to 1 for your extraction.",
  ].join("\n");
}

export function buildSummaryPrompt({
  fields,
  transcript,
}: {
  fields: LeadDraft;
  transcript: string;
}) {
  return [
    "You are a sales operations assistant for a B2B SaaS company.",
    "Create a concise lead summary for an internal sales admin panel.",
    "Do not invent facts. Mention missing critical context as a warning.",
    "",
    `Structured fields: ${JSON.stringify(fields)}`,
    `Conversation transcript: ${transcript}`,
    "",
    "Return JSON only.",
  ].join("\n");
}
