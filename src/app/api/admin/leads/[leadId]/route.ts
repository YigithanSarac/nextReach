import { NextRequest, NextResponse } from "next/server";

import { apiError, readJsonRequest } from "@/lib/api";
import type { AdminLeadDetailResponse, UpdateLeadResponse } from "@/lib/domain/api";
import {
  mapChatMessageRow,
  mapLeadRow,
  type ChatMessageRow,
  type LeadRow,
} from "@/lib/domain/database";
import {
  formatZodError,
  leadIdParamsSchema,
  updateLeadRequestSchema,
} from "@/lib/validation";
import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const parsed = leadIdParamsSchema.safeParse(params);

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
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", parsed.data.leadId)
    .maybeSingle();

  if (leadError) {
    return apiError("LEADS_FETCH_FAILED", "Lead detail could not be loaded.", 500);
  }

  if (!lead) {
    return apiError("LEAD_NOT_FOUND", "Lead was not found.", 404);
  }

  const messages = lead.session_id
    ? await loadLeadMessages(supabase, lead.session_id)
    : [];

  const mappedLead = mapLeadRow(lead as LeadRow);
  const response: AdminLeadDetailResponse = {
    ...mappedLead,
    messages: messages.map((message) => {
      const mappedMessage = mapChatMessageRow(message);

      return {
        sender: mappedMessage.sender,
        step: mappedMessage.step,
        content: mappedMessage.content,
        createdAt: mappedMessage.createdAt,
        aiExtraction: mappedMessage.aiExtraction,
        aiConfidence: mappedMessage.aiConfidence,
        extractionStatus: mappedMessage.extractionStatus,
        flags: mappedMessage.flags,
      };
    }),
  };

  return NextResponse.json(response);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const parsedParams = leadIdParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    const formatted = formatZodError(parsedParams.error);
    return apiError(
      formatted.error.code,
      formatted.error.message,
      400,
      formatted.error.details
    );
  }

  const body = await readJsonRequest(request);
  const parsedBody = updateLeadRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    const formatted = formatZodError(parsedBody.error);
    return apiError(
      formatted.error.code,
      formatted.error.message,
      400,
      formatted.error.details
    );
  }

  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .update({
      ...(parsedBody.data.status !== undefined
        ? { status: parsedBody.data.status }
        : {}),
      ...(parsedBody.data.notes !== undefined ? { notes: parsedBody.data.notes } : {}),
    })
    .eq("id", parsedParams.data.leadId)
    .select("id, status, updated_at, notes")
    .maybeSingle();

  if (error) {
    return apiError("LEADS_FETCH_FAILED", "Lead could not be updated.", 500);
  }

  if (!lead) {
    return apiError("LEAD_NOT_FOUND", "Lead was not found.", 404);
  }

  const response: UpdateLeadResponse = {
    id: lead.id,
    status: lead.status,
    updatedAt: lead.updated_at,
    notes: lead.notes,
  };

  return NextResponse.json(response);
}

async function loadLeadMessages(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as unknown as ChatMessageRow[];
}
