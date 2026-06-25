export const geminiLeadExtractionJsonSchema = {
  type: "object",
  properties: {
    extracted: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: ["pricing", "demo", "integration", "general", "other", "unknown"],
        },
        urgency: {
          type: "string",
          enum: ["immediate", "this_month", "later", "researching", "unknown"],
        },
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        website: { type: "string" },
        platform: { type: "string" },
        companySize: { type: "string" },
        needSummary: { type: "string" },
        missingFields: {
          type: "array",
          items: { type: "string" },
        },
        spamFlags: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    refusalDetected: { type: "boolean" },
    topicShiftDetected: { type: "boolean" },
    isMeaningless: { type: "boolean" },
    spamLikelihood: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
  },
  required: [
    "extracted",
    "refusalDetected",
    "topicShiftDetected",
    "isMeaningless",
    "spamLikelihood",
    "confidence",
  ],
} as const;

export const geminiLeadSummaryJsonSchema = {
  type: "object",
  properties: {
    leadSummary: {
      type: "string",
      description:
        "A concise sales-facing summary of who reached out, why, urgency, and follow-up context.",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["leadSummary", "confidence", "warnings"],
} as const;
