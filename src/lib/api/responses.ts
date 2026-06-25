import { NextResponse } from "next/server";

import type { ApiErrorCode, ApiErrorResponse } from "@/lib/domain";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, string[]>
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return NextResponse.json(body, { status });
}

export function internalError(message = "Unexpected server error.") {
  return apiError("INTERNAL_ERROR", message, 500);
}
