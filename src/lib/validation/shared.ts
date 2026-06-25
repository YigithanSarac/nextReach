import { z } from "zod";

import {
  CHAT_STEPS,
  LEAD_INTENTS,
  LEAD_QUALITIES,
  LEAD_STATUSES,
  LEAD_URGENCIES,
} from "@/lib/domain";

export const chatStepSchema = z.enum(CHAT_STEPS);
export const leadIntentSchema = z.enum(LEAD_INTENTS);
export const leadUrgencySchema = z.enum(LEAD_URGENCIES);
export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const leadQualitySchema = z.enum(LEAD_QUALITIES);

export const metadataSchema = z.record(z.string(), z.unknown());

export const messageSchema = z
  .string()
  .trim()
  .min(1, "Message is required.")
  .max(2000, "Message must be 2,000 characters or fewer.");

export const optionalTextSchema = z
  .string()
  .trim()
  .max(5000)
  .nullable()
  .optional();

export const emailSchema = z
  .string()
  .trim()
  .email("Email must be valid.")
  .max(254);

export const urlLikeSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      try {
        new URL(value.startsWith("http") ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Website must be a valid URL or domain." }
  );

export const leadDraftSchema = z.object({
  intent: leadIntentSchema.nullish(),
  urgency: leadUrgencySchema.nullish(),
  name: z.string().trim().max(200).nullish(),
  email: emailSchema.nullish(),
  phone: z.string().trim().max(50).nullish(),
  company: z.string().trim().max(200).nullish(),
  website: urlLikeSchema.nullish(),
  platform: z.string().trim().max(100).nullish(),
  companySize: z.string().trim().max(100).nullish(),
  needSummary: z.string().trim().max(2000).nullish(),
  missingFields: z.array(z.string().trim().min(1)).optional(),
  spamFlags: z.array(z.string().trim().min(1)).optional(),
});

export const apiErrorDetailsSchema = z.record(
  z.string(),
  z.array(z.string())
);
