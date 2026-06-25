import { NextResponse } from "next/server";

import { apiError, internalError, readJsonRequest } from "@/lib/api";
import { transitionChatState } from "@/lib/chatbot";
import { extractLeadDataSafely, summarizeLeadSafely } from "@/lib/ai";
import type { ChatFlag, ChatStep, ExtractionStatus } from "@/lib/domain/chat";
import type { SendChatMessageResponse } from "@/lib/domain/api";
import type { ChatSessionRow } from "@/lib/domain/database";
import type {
  AiExtractionResult,
  ExtractedFields,
  LeadDraft,
  LeadStatus,
} from "@/lib/domain/lead";
import { scoreLead } from "@/lib/leads";
import { formatZodError, sendChatMessageRequestSchema } from "@/lib/validation";
import { createAdminClient } from "@/utils/supabase/admin";

const QUICK_MESSAGE_THRESHOLD_MS = 800;

type RecentUserMessage = {
  content: string;
  created_at: string;
};

export async function POST(request: Request) {
  const body = await readJsonRequest(request);
  const parsed = sendChatMessageRequestSchema.safeParse(body);

  if (!parsed.success) {
    const formatted = formatZodError(parsed.error);
    return apiError(
      formatted.error.code,
      formatted.error.message,
      400,
      formatted.error.details
    );
  }

  const supabase = createAdminClient();
  const { sessionId, message } = parsed.data;

  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return internalError("Chat session could not be loaded.");
  }

  if (!session) {
    return apiError("SESSION_NOT_FOUND", "Chat session was not found.", 404);
  }

  if (session.status !== "active" || session.current_step === "COMPLETE") {
    return apiError(
      "SESSION_ALREADY_COMPLETED",
      "This chat session is already closed.",
      409
    );
  }

  const recentMessages = await loadRecentUserMessages(supabase, session.id);
  const previousMessages = recentMessages.map((item) => item.content);
  const safeExtraction = await extractLeadDataSafely({
    currentStep: session.current_step,
    message,
    collectedFields: session.collected_fields as LeadDraft,
    previousMessages,
  });

  const recentDuplicateCount = countRecentDuplicates(message, recentMessages);
  const sentTooQuickly = wasSentTooQuickly(recentMessages[0]);
  const repairAttempts = readRepairAttempts(session.metadata);

  const stateResult = transitionChatState({
    currentStep: session.current_step,
    collectedFields: session.collected_fields as LeadDraft,
    extraction: safeExtraction.extraction,
    messageCount: session.message_count,
    repairAttempts,
    recentDuplicateCount,
    sentTooQuickly,
  });

  const flags = uniqueFlags([...safeExtraction.flags, ...stateResult.flags]);
  const extractionStatus: ExtractionStatus =
    safeExtraction.source === "gemini" ? "completed" : "fallback_used";

  const { error: userMessageError } = await supabase.from("chat_messages").insert({
    session_id: session.id,
    sender: "user",
    step: session.current_step,
    content: message,
    ai_extraction: safeExtraction.extraction as unknown as Record<string, unknown>,
    ai_confidence: safeExtraction.extraction.confidence,
    extraction_status: extractionStatus,
    flags,
  });

  if (userMessageError) {
    return internalError("User message could not be saved.");
  }

  const { error: botMessageError } = await supabase.from("chat_messages").insert({
    session_id: session.id,
    sender: "bot",
    step: stateResult.nextStep,
    content: stateResult.botMessage,
    extraction_status: "not_requested",
    flags: stateResult.flags,
  });

  if (botMessageError) {
    return internalError("Bot message could not be saved.");
  }

  let leadId: string | undefined;

  if (stateResult.isComplete) {
    try {
      leadId = await persistLeadForCompletedSession({
        supabase,
        session,
        fields: stateResult.collectedFields,
        extraction: safeExtraction.extraction,
        aiSource: safeExtraction.source,
        flags,
      });
    } catch {
      return internalError("Lead could not be created for completed chat.");
    }
  }

  const { error: updateError } = await supabase
    .from("chat_sessions")
    .update({
      current_step: stateResult.nextStep,
      status: stateResult.isComplete ? "completed" : "active",
      completed_at: stateResult.isComplete ? new Date().toISOString() : null,
      collected_fields: stateResult.collectedFields as Record<string, unknown>,
      message_count: session.message_count + 1,
      spam_score: Math.max(
        session.spam_score ?? 0,
        safeExtraction.extraction.spamLikelihood
      ),
      spam_flags: uniqueStrings([...(session.spam_flags ?? []), ...flags]),
      metadata: buildUpdatedMetadata({
        session,
        nextStep: stateResult.nextStep,
        repairAttempts,
        extraction: safeExtraction.extraction,
        aiSource: safeExtraction.source,
        aiError: safeExtraction.error,
      }),
    })
    .eq("id", session.id);

  if (updateError) {
    return internalError("Chat session could not be updated.");
  }

  const response: SendChatMessageResponse = {
    sessionId: session.id,
    previousStep: stateResult.previousStep,
    nextStep: stateResult.nextStep,
    botMessage: stateResult.botMessage,
    collectedFields: stateResult.collectedFields,
    flags,
    isComplete: stateResult.isComplete,
    leadId,
  };

  return NextResponse.json(response);
}

async function loadRecentUserMessages(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .eq("sender", "user")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return [];
  }

  return (data ?? []) as RecentUserMessage[];
}

async function persistLeadForCompletedSession({
  supabase,
  session,
  fields,
  extraction,
  aiSource,
  flags,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  session: ChatSessionRow;
  fields: LeadDraft;
  extraction: AiExtractionResult;
  aiSource: "gemini" | "fallback";
  flags: ChatFlag[];
}) {
  const existingLead = await findExistingLeadId(supabase, session.id);

  if (existingLead) {
    return existingLead;
  }

  const transcript = await loadSessionTranscript(supabase, session.id);
  const summary = await summarizeLeadSafely({
    fields,
    transcript,
  });
  const scoring = scoreLead({ fields, extraction });
  const spamFlags = uniqueStrings([
    ...(fields.spamFlags ?? []),
    ...flags,
    ...summary.flags,
  ]);
  const leadStatus: LeadStatus =
    extraction.spamLikelihood >= 0.8 || spamFlags.includes("spam_suspected")
      ? "spam"
      : "new";

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      session_id: session.id,
      status: leadStatus,
      quality: scoring.quality,
      score: scoring.score,
      intent: fields.intent ?? "unknown",
      urgency: fields.urgency ?? "unknown",
      name: fields.name ?? null,
      email: fields.email ?? null,
      phone: fields.phone ?? null,
      company: fields.company ?? null,
      website: fields.website ?? null,
      platform: fields.platform ?? null,
      company_size: fields.companySize ?? null,
      need_summary: fields.needSummary ?? null,
      lead_summary: summary.summary.leadSummary,
      missing_fields: scoring.missingFields,
      extracted_fields: buildExtractedFields(fields, aiSource, extraction.confidence),
      ai_summary: {
        source: summary.source,
        confidence: summary.summary.confidence,
        warnings: summary.summary.warnings,
        error: summary.error,
      },
      scoring_breakdown: scoring.breakdown,
      spam_flags: spamFlags,
      source: readLeadSource(session.metadata),
    })
    .select("id")
    .single();

  if (error || !lead) {
    throw new Error("Lead could not be created.");
  }

  return lead.id;
}

async function findExistingLeadId(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.id ?? null;
}

async function loadSessionTranscript(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("sender, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return "";
  }

  return (data ?? [])
    .map((item) => `${item.sender}: ${item.content}`)
    .join("\n");
}

function buildExtractedFields(
  fields: LeadDraft,
  aiSource: "gemini" | "fallback",
  confidence: number
): ExtractedFields {
  const source = aiSource === "gemini" ? "ai" : "fallback";

  return {
    ...(fields.intent
      ? { intent: { value: fields.intent, source, confidence } }
      : {}),
    ...(fields.urgency
      ? { urgency: { value: fields.urgency, source, confidence } }
      : {}),
    ...(fields.name ? { name: { value: fields.name, source, confidence } } : {}),
    ...(fields.email ? { email: { value: fields.email, source, confidence } } : {}),
    ...(fields.phone ? { phone: { value: fields.phone, source, confidence } } : {}),
    ...(fields.company
      ? { company: { value: fields.company, source, confidence } }
      : {}),
    ...(fields.website
      ? { website: { value: fields.website, source, confidence } }
      : {}),
    ...(fields.platform
      ? { platform: { value: fields.platform, source, confidence } }
      : {}),
    ...(fields.companySize
      ? { companySize: { value: fields.companySize, source, confidence } }
      : {}),
    ...(fields.needSummary
      ? { needSummary: { value: fields.needSummary, source, confidence } }
      : {}),
  };
}

function countRecentDuplicates(message: string, recentMessages: RecentUserMessage[]) {
  const normalizedMessage = normalizeMessage(message);

  return recentMessages.filter(
    (item) => normalizeMessage(item.content) === normalizedMessage
  ).length;
}

function wasSentTooQuickly(lastUserMessage?: RecentUserMessage) {
  if (!lastUserMessage) {
    return false;
  }

  const lastMessageAt = new Date(lastUserMessage.created_at).getTime();

  if (Number.isNaN(lastMessageAt)) {
    return false;
  }

  return Date.now() - lastMessageAt < QUICK_MESSAGE_THRESHOLD_MS;
}

function readRepairAttempts(metadata: Record<string, unknown>) {
  const value = metadata.repairAttempts;

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildUpdatedMetadata({
  session,
  nextStep,
  repairAttempts,
  extraction,
  aiSource,
  aiError,
}: {
  session: ChatSessionRow;
  nextStep: ChatStep;
  repairAttempts: number;
  extraction: AiExtractionResult;
  aiSource: "gemini" | "fallback";
  aiError: { code: string; message: string } | null;
}) {
  return {
    ...session.metadata,
    lastAiSource: aiSource,
    lastAiError: aiError,
    lastExtractionConfidence: extraction.confidence,
    repairAttempts: nextStep === "FALLBACK_REPAIR" ? repairAttempts + 1 : 0,
  };
}

function readLeadSource(metadata: Record<string, unknown>) {
  return typeof metadata.source === "string" && metadata.source.trim()
    ? metadata.source
    : "landing_chatbot";
}

function normalizeMessage(message: string) {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueFlags(flags: ChatFlag[]) {
  return Array.from(new Set(flags));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}
