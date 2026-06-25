import type { ChatStep } from "@/lib/domain/chat";
import type { AiExtractionResult, LeadDraft } from "@/lib/domain/lead";
import { getGeminiEnv } from "@/lib/env";
import { aiExtractionResultSchema, aiSummaryResultSchema } from "@/lib/validation";

import { buildExtractionPrompt, buildSummaryPrompt } from "./prompts";
import {
  geminiLeadExtractionJsonSchema,
  geminiLeadSummaryJsonSchema,
} from "./schemas";

const GEMINI_INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

export type AiSummaryResult = {
  leadSummary: string;
  confidence: number;
  warnings: string[];
};

export type ExtractLeadDataInput = {
  currentStep: ChatStep;
  message: string;
  collectedFields: LeadDraft;
  signal?: AbortSignal;
};

export type SummarizeLeadInput = {
  fields: LeadDraft;
  transcript: string;
  signal?: AbortSignal;
};

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "AI_CONFIG_MISSING"
      | "AI_HTTP_ERROR"
      | "AI_INVALID_JSON"
      | "AI_SCHEMA_ERROR"
      | "AI_EMPTY_RESPONSE",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export async function extractLeadDataWithGemini({
  currentStep,
  message,
  collectedFields,
  signal,
}: ExtractLeadDataInput): Promise<AiExtractionResult> {
  const raw = await callGeminiStructuredJson({
    prompt: buildExtractionPrompt({ currentStep, message, collectedFields }),
    schema: geminiLeadExtractionJsonSchema,
    signal,
  });

  const parsed = aiExtractionResultSchema.safeParse(raw);

  if (!parsed.success) {
    throw new AiServiceError(
      "Gemini extraction response did not match the expected schema.",
      "AI_SCHEMA_ERROR",
      parsed.error
    );
  }

  return parsed.data;
}

export async function summarizeLeadWithGemini({
  fields,
  transcript,
  signal,
}: SummarizeLeadInput): Promise<AiSummaryResult> {
  const raw = await callGeminiStructuredJson({
    prompt: buildSummaryPrompt({ fields, transcript }),
    schema: geminiLeadSummaryJsonSchema,
    signal,
  });

  const parsed = aiSummaryResultSchema.safeParse(raw);

  if (!parsed.success) {
    throw new AiServiceError(
      "Gemini summary response did not match the expected schema.",
      "AI_SCHEMA_ERROR",
      parsed.error
    );
  }

  return parsed.data;
}

async function callGeminiStructuredJson({
  prompt,
  schema,
  signal,
}: {
  prompt: string;
  schema: unknown;
  signal?: AbortSignal;
}) {
  let env: ReturnType<typeof getGeminiEnv>;

  try {
    env = getGeminiEnv();
  } catch (error) {
    throw new AiServiceError(
      "GEMINI_API_KEY is not configured.",
      "AI_CONFIG_MISSING",
      error
    );
  }

  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.apiKey,
    },
    body: JSON.stringify({
      model: env.model,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema,
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new AiServiceError(
      `Gemini request failed with status ${response.status}.`,
      "AI_HTTP_ERROR",
      await safeReadResponseText(response)
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new AiServiceError(
      "Gemini returned an empty structured output.",
      "AI_EMPTY_RESPONSE",
      payload
    );
  }

  try {
    return JSON.parse(outputText) as unknown;
  } catch (error) {
    throw new AiServiceError(
      "Gemini returned invalid JSON.",
      "AI_INVALID_JSON",
      error
    );
  }
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (typeof payload.outputText === "string") {
    return payload.outputText;
  }

  if (typeof payload.text === "string") {
    return payload.text;
  }

  const steps = payload.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      if (!isRecord(step) || step.type !== "model_output") {
        continue;
      }

      const content = step.content;
      if (!Array.isArray(content)) {
        continue;
      }

      for (const item of content) {
        if (isRecord(item) && typeof item.text === "string") {
          return item.text;
        }
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function safeReadResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return null;
  }
}
