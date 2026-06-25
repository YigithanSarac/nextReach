import { type ZodError } from "zod";

import type { ApiErrorResponse } from "@/lib/domain";

export function formatZodError(error: ZodError): ApiErrorResponse {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "form";
    details[field] = [...(details[field] ?? []), issue.message];
  }

  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Submitted data is invalid.",
      details,
    },
  };
}
