import { extractWithFallback } from "@/lib/chatbot/fallback-extraction";
import type { ChatFlag, ChatStep } from "@/lib/domain/chat";
import type { AiExtractionResult, LeadDraft } from "@/lib/domain/lead";
import { buildDeterministicLeadSummary } from "@/lib/leads";

import {
  AiServiceError,
  extractLeadDataWithGemini,
  type AiSummaryResult,
  summarizeLeadWithGemini,
} from "./gemini";

export type SafeExtractionInput = {
  currentStep: ChatStep;
  message: string;
  collectedFields: LeadDraft;
  previousMessages?: string[];
  timeoutMs?: number;
};

export type SafeExtractionResult = {
  extraction: AiExtractionResult;
  source: "gemini" | "fallback";
  flags: ChatFlag[];
  error: SerializableAiError | null;
};

export type SafeSummaryInput = {
  fields: LeadDraft;
  transcript: string;
  timeoutMs?: number;
};

export type SafeSummaryResult = {
  summary: AiSummaryResult;
  source: "gemini" | "deterministic";
  flags: ChatFlag[];
  error: SerializableAiError | null;
};

export type SerializableAiError = {
  code: string;
  message: string;
};

const DEFAULT_AI_TIMEOUT_MS = 6000;

export async function extractLeadDataSafely({
  currentStep,
  message,
  collectedFields,
  previousMessages = [],
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
}: SafeExtractionInput): Promise<SafeExtractionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const extraction = await extractLeadDataWithGemini({
      currentStep,
      message,
      collectedFields,
      signal: controller.signal,
    });

    return {
      extraction,
      source: "gemini",
      flags: [],
      error: null,
    };
  } catch (error) {
    return {
      extraction: extractWithFallback({
        currentStep,
        message,
        previousMessages,
      }),
      source: "fallback",
      flags: ["ai_extraction_failed", "fallback_used"],
      error: serializeAiError(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function summarizeLeadSafely({
  fields,
  transcript,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
}: SafeSummaryInput): Promise<SafeSummaryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const summary = await summarizeLeadWithGemini({
      fields,
      transcript,
      signal: controller.signal,
    });

    return {
      summary,
      source: "gemini",
      flags: [],
      error: null,
    };
  } catch (error) {
    return {
      summary: {
        leadSummary: buildDeterministicLeadSummary(fields),
        confidence: 0.5,
        warnings: ["AI summary failed; deterministic summary was used."],
      },
      source: "deterministic",
      flags: ["ai_summary_failed", "deterministic_summary_used"],
      error: serializeAiError(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function serializeAiError(error: unknown): SerializableAiError {
  if (error instanceof AiServiceError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: "AI_TIMEOUT",
      message: "AI request timed out.",
    };
  }

  if (error instanceof Error) {
    return {
      code: "AI_UNKNOWN_ERROR",
      message: error.message,
    };
  }

  return {
    code: "AI_UNKNOWN_ERROR",
    message: "Unknown AI service error.",
  };
}
