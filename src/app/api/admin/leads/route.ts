import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import type { AdminLeadListResponse } from "@/lib/domain/api";
import type { LeadRow } from "@/lib/domain/database";
import { adminLeadListQuerySchema, formatZodError } from "@/lib/validation";
import { createAdminClient } from "@/utils/supabase/admin";

type LeadListRow = Pick<
  LeadRow,
  | "id"
  | "created_at"
  | "status"
  | "quality"
  | "score"
  | "intent"
  | "urgency"
  | "company"
  | "name"
  | "email"
  | "lead_summary"
>;

export async function GET(request: NextRequest) {
  const queryObject = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminLeadListQuerySchema.safeParse(queryObject);

  if (!parsed.success) {
    const formatted = formatZodError(parsed.error);
    return apiError(
      formatted.error.code,
      formatted.error.message,
      400,
      formatted.error.details
    );
  }

  const { status, quality, intent, search, limit, cursor } = parsed.data;

  if (cursor && Number.isNaN(new Date(cursor).getTime())) {
    return apiError("VALIDATION_ERROR", "Cursor must be a valid timestamp.", 400, {
      cursor: ["Cursor must be a valid timestamp."],
    });
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("leads")
    .select(
      [
        "id",
        "created_at",
        "status",
        "quality",
        "score",
        "intent",
        "urgency",
        "company",
        "name",
        "email",
        "lead_summary",
      ].join(", ")
    )
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (quality) {
    query = query.eq("quality", quality);
  }

  if (intent) {
    query = query.eq("intent", intent);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (search) {
    const pattern = `%${sanitizeSearchTerm(search)}%`;
    query = query.or(
      [
        `name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `company.ilike.${pattern}`,
        `lead_summary.ilike.${pattern}`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    return apiError("LEADS_FETCH_FAILED", "Leads could not be loaded.", 500);
  }

  const rows = (data ?? []) as unknown as LeadListRow[];
  const visibleRows = rows.slice(0, limit);
  const hasNextPage = rows.length > limit;
  const response: AdminLeadListResponse = {
    items: visibleRows.map((lead) => ({
      id: lead.id,
      createdAt: lead.created_at,
      status: lead.status,
      quality: lead.quality,
      score: lead.score,
      intent: lead.intent,
      urgency: lead.urgency,
      company: lead.company,
      name: lead.name,
      email: lead.email,
      leadSummary: lead.lead_summary,
    })),
    nextCursor: hasNextPage
      ? visibleRows[visibleRows.length - 1]?.created_at ?? null
      : null,
  };

  return NextResponse.json(response);
}

function sanitizeSearchTerm(value: string) {
  return value.replace(/[,%]/g, " ").trim();
}
