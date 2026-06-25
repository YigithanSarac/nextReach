import { z } from "zod";

import { leadDraftSchema } from "./shared";

export const aiExtractionResultSchema = z.object({
  extracted: leadDraftSchema.default({}),
  refusalDetected: z.boolean().default(false),
  topicShiftDetected: z.boolean().default(false),
  isMeaningless: z.boolean().default(false),
  spamLikelihood: z.number().min(0).max(1).default(0),
  confidence: z.number().min(0).max(1).default(0),
});

export const aiSummaryResultSchema = z.object({
  leadSummary: z.string().trim().min(1).max(1000),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string().trim().min(1)).default([]),
});

export type AiExtractionResultInput = z.input<typeof aiExtractionResultSchema>;
export type AiSummaryResultInput = z.input<typeof aiSummaryResultSchema>;
