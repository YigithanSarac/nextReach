import { NextResponse } from "next/server";

import { apiError, internalError, readJsonRequest } from "@/lib/api";
import { getInitialBotMessage } from "@/lib/chatbot";
import type { CreateChatSessionResponse } from "@/lib/domain";
import { formatZodError, createChatSessionRequestSchema } from "@/lib/validation";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const body = await readJsonRequest(request);
  const parsed = createChatSessionRequestSchema.safeParse(body);

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
  const botMessage = getInitialBotMessage();

  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .insert({
      current_step: "GREETING",
      status: "active",
      collected_fields: {},
      metadata: {
        ...parsed.data.metadata,
        source: parsed.data.source,
      },
    })
    .select("id, current_step")
    .single();

  if (sessionError || !session) {
    return apiError(
      "SESSION_CREATE_FAILED",
      "Chat session could not be created.",
      500
    );
  }

  const { error: messageError } = await supabase.from("chat_messages").insert({
    session_id: session.id,
    sender: "bot",
    step: "GREETING",
    content: botMessage,
    extraction_status: "not_requested",
    flags: [],
  });

  if (messageError) {
    return internalError("Initial chatbot message could not be saved.");
  }

  const response: CreateChatSessionResponse = {
    sessionId: session.id,
    currentStep: session.current_step,
    botMessage,
  };

  return NextResponse.json(response, { status: 201 });
}
