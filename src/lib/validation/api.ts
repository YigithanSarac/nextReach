import { z } from "zod";

import {
  chatStepSchema,
  leadIntentSchema,
  leadQualitySchema,
  leadStatusSchema,
  messageSchema,
  metadataSchema,
} from "./shared";

export const createChatSessionRequestSchema = z.object({
  source: z.string().trim().min(1).max(100).default("landing_page"),
  metadata: metadataSchema.default({}),
});

export const sendChatMessageRequestSchema = z.object({
  sessionId: z.uuid("Session id must be a valid UUID."),
  message: messageSchema,
  clientStep: chatStepSchema.optional(),
});

export const getChatSessionParamsSchema = z.object({
  sessionId: z.uuid("Session id must be a valid UUID."),
});

export const adminLeadListQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  quality: leadQualitySchema.optional(),
  intent: leadIntentSchema.optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).optional(),
});

export const leadIdParamsSchema = z.object({
  leadId: z.uuid("Lead id must be a valid UUID."),
});

export const updateLeadRequestSchema = z
  .object({
    status: leadStatusSchema.optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .strict()
  .refine((value) => value.status !== undefined || value.notes !== undefined, {
    message: "At least one field must be provided.",
  });

export type CreateChatSessionRequestInput = z.input<
  typeof createChatSessionRequestSchema
>;

export type SendChatMessageRequestInput = z.input<
  typeof sendChatMessageRequestSchema
>;

export type AdminLeadListQueryInput = z.input<
  typeof adminLeadListQuerySchema
>;

export type UpdateLeadRequestInput = z.input<typeof updateLeadRequestSchema>;
