import type { ChatFlag, ChatStep } from "@/lib/domain/chat";
import type { AiExtractionResult, LeadDraft } from "@/lib/domain/lead";

export type StateMachineContext = {
  currentStep: ChatStep;
  collectedFields: LeadDraft;
  extraction: AiExtractionResult;
  messageCount: number;
  repairAttempts?: number;
  recentDuplicateCount?: number;
  sentTooQuickly?: boolean;
};

export type StateMachineResult = {
  previousStep: ChatStep;
  nextStep: ChatStep;
  botMessage: string;
  collectedFields: LeadDraft;
  flags: ChatFlag[];
  isComplete: boolean;
};

const MIN_MEANINGFUL_CONFIDENCE = 0.45;
const SPAM_GUARD_THRESHOLD = 0.8;

export function transitionChatState(
  context: StateMachineContext
): StateMachineResult {
  const flags = collectGlobalFlags(context);
  const collectedFields = mergeLeadDraft(
    context.collectedFields,
    context.extraction.extracted
  );

  if (shouldEnterSpamGuard(context)) {
    return result(context.currentStep, "SPAM_GUARD", collectedFields, flags, {
      botMessage:
        "Please send your request in one short message so I can continue.",
    });
  }

  if (
    context.currentStep !== "FALLBACK_REPAIR" &&
    context.currentStep !== "CONFIRMATION" &&
    shouldRepair(context)
  ) {
    return result(context.currentStep, "FALLBACK_REPAIR", collectedFields, flags, {
      botMessage:
        "I could not understand that clearly. We can continue with pricing, demo, integration, or a general question. Which one fits best?",
    });
  }

  switch (context.currentStep) {
    case "GREETING":
      return handleGreeting(context, collectedFields, flags);
    case "INTENT":
      return handleIntent(context, collectedFields, flags);
    case "COMPANY_CONTEXT":
      return handleCompanyContext(context, collectedFields, flags);
    case "NEED_DETAILS":
      return handleNeedDetails(context, collectedFields, flags);
    case "URGENCY":
      return handleUrgency(context, collectedFields, flags);
    case "CONTACT_INFO":
      return handleContactInfo(context, collectedFields, flags);
    case "CONFIRMATION":
      return handleConfirmation(context, collectedFields, flags);
    case "FALLBACK_REPAIR":
      return handleFallbackRepair(context, collectedFields, flags);
    case "SPAM_GUARD":
      return handleSpamGuard(context, collectedFields, flags);
    case "COMPLETE":
      return result("COMPLETE", "COMPLETE", collectedFields, flags, {
        botMessage: "Your request has been sent to the team.",
        isComplete: true,
      });
  }
}

export function getInitialBotMessage() {
  return "Hi, I will ask a few short questions to route you to the right person. Are you interested in pricing, a demo, integration, or something else?";
}

export function isLeadReadyForConfirmation(fields: LeadDraft) {
  return Boolean(fields.intent && fields.needSummary && fields.email);
}

function handleGreeting(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (hasKnownIntent(fields)) {
    return result(context.currentStep, "COMPANY_CONTEXT", fields, flags, {
      botMessage:
        "Sure. To route this correctly, can you share your company name or website?",
    });
  }

  return result(context.currentStep, "INTENT", fields, flags, {
    botMessage:
      "What would you like to talk about: pricing, a demo, integration, or another topic?",
  });
}

function handleIntent(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (hasKnownIntent(fields)) {
    return result(context.currentStep, "COMPANY_CONTEXT", fields, flags, {
      botMessage:
        fields.intent === "pricing"
          ? "Sure, we can help with pricing. Can you share your company name or website?"
          : "Got it. Can you share your company name or website? If relevant, include your ecommerce platform too.",
    });
  }

  if (context.extraction.refusalDetected) {
    return result(
      context.currentStep,
      "COMPANY_CONTEXT",
      { ...fields, intent: "general" },
      flags,
      {
        botMessage:
          "No problem, I will treat this as a general request. Can you share your company name or website?",
      }
    );
  }

  return result(context.currentStep, "INTENT", fields, addFlag(flags, "clarification_requested"), {
    botMessage:
      "We can continue with pricing, demo, integration, or a general question. Which one fits?",
  });
}

function handleCompanyContext(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (fields.company || fields.website || fields.platform) {
    return result(context.currentStep, "NEED_DETAILS", fields, flags, {
      botMessage:
        "Can you briefly describe what you are trying to solve? For example: pricing, demo, integration, or reporting needs.",
    });
  }

  if (context.extraction.refusalDetected) {
    return result(context.currentStep, "NEED_DETAILS", fields, addFlag(flags, "company_skipped"), {
      botMessage:
        "No problem. Can you briefly describe what you are trying to solve?",
    });
  }

  return result(
    context.currentStep,
    "COMPANY_CONTEXT",
    fields,
    addFlag(flags, "clarification_requested"),
    {
      botMessage:
        "If you prefer not to share the company name, you can share your industry, website, or platform instead.",
    }
  );
}

function handleNeedDetails(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (fields.needSummary) {
    return result(context.currentStep, "URGENCY", fields, flags, {
      botMessage:
        "How urgent is this for you? Are you looking now, this month, later, or just researching?",
    });
  }

  if (context.extraction.refusalDetected) {
    return result(context.currentStep, "URGENCY", fields, flags, {
      botMessage:
        "No problem. Timing helps the team prioritize. Is this urgent, this month, or just research?",
    });
  }

  return result(
    context.currentStep,
    "NEED_DETAILS",
    fields,
    addFlag(flags, "clarification_requested"),
    {
      botMessage:
        "Can you write your need in one sentence so I can note it correctly? For example: pricing, demo, or integration.",
    }
  );
}

function handleUrgency(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (fields.urgency && fields.urgency !== "unknown") {
    return result(context.currentStep, "CONTACT_INFO", fields, flags, {
      botMessage:
        "Can you share your name and work email so the team can follow up?",
    });
  }

  if (context.extraction.refusalDetected) {
    return result(
      context.currentStep,
      "CONTACT_INFO",
      { ...fields, urgency: "unknown" },
      flags,
      {
        botMessage:
          "No problem. Can you share your name and work email so the team can follow up?",
      }
    );
  }

  return result(
    context.currentStep,
    "CONTACT_INFO",
    { ...fields, urgency: fields.urgency ?? "unknown" },
    flags,
    {
      botMessage:
        "I will mark the timing as unknown. Can you share your name and work email so the team can follow up?",
    }
  );
}

function handleContactInfo(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (fields.email) {
    return result(context.currentStep, "CONFIRMATION", fields, flags, {
      botMessage: buildConfirmationMessage(fields),
    });
  }

  if (context.extraction.refusalDetected) {
    return result(
      context.currentStep,
      "CONFIRMATION",
      {
        ...fields,
        missingFields: [...(fields.missingFields ?? []), "email"],
      },
      addFlag(flags, "missing_contact"),
      {
        botMessage:
          "No problem. Without contact details, the team cannot follow up. Should I still save this request for review?",
      }
    );
  }

  return result(context.currentStep, "CONTACT_INFO", fields, addFlag(flags, "invalid_email"), {
    botMessage:
      "We need a valid email address to follow up. Can you share it?",
  });
}

function handleConfirmation(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (context.extraction.refusalDetected) {
    return result(context.currentStep, "COMPLETE", fields, flags, {
      botMessage:
        "Understood. I will send the request to the team with the information we have. Thank you.",
      isComplete: true,
    });
  }

  return result(context.currentStep, "COMPLETE", fields, flags, {
    botMessage:
      "Thank you. I sent your request to the team, and they will follow up as soon as possible.",
    isComplete: true,
  });
}

function handleFallbackRepair(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (hasKnownIntent(fields)) {
    return result(context.currentStep, "COMPANY_CONTEXT", fields, flags, {
      botMessage:
        "Okay, let's continue from there. Can you share your company name or website?",
    });
  }

  if ((context.repairAttempts ?? 0) >= 2) {
    return result(context.currentStep, "CONTACT_INFO", fields, addFlag(flags, "low_confidence"), {
      botMessage:
        "I could not clarify the topic, but I can still collect your contact details for the team. Can you share your name and email?",
    });
  }

  return result(context.currentStep, "FALLBACK_REPAIR", fields, flags, {
    botMessage:
      "We can continue with pricing, demo, integration, or a general question. Which one fits?",
  });
}

function handleSpamGuard(
  context: StateMachineContext,
  fields: LeadDraft,
  flags: ChatFlag[]
): StateMachineResult {
  if (context.extraction.spamLikelihood >= SPAM_GUARD_THRESHOLD) {
    return result(context.currentStep, "SPAM_GUARD", fields, addFlag(flags, "spam_suspected"), {
      botMessage:
        "I cannot process this request right now. Please try again later.",
    });
  }

  return result(context.currentStep, "INTENT", fields, flags, {
    botMessage:
      "We can continue. Are you interested in pricing, demo, integration, or a general question?",
  });
}

function mergeLeadDraft(current: LeadDraft, extracted: LeadDraft): LeadDraft {
  return {
    ...current,
    ...removeEmptyValues(extracted),
    missingFields: mergeStringArrays(current.missingFields, extracted.missingFields),
    spamFlags: mergeStringArrays(current.spamFlags, extracted.spamFlags),
  };
}

function removeEmptyValues(fields: LeadDraft): LeadDraft {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return true;
    })
  ) as LeadDraft;
}

function mergeStringArrays(first?: string[], second?: string[]) {
  return Array.from(new Set([...(first ?? []), ...(second ?? [])]));
}

function collectGlobalFlags(context: StateMachineContext): ChatFlag[] {
  const flags: ChatFlag[] = [];

  if (context.extraction.confidence < MIN_MEANINGFUL_CONFIDENCE) {
    flags.push("low_confidence");
  }

  if (context.extraction.isMeaningless) {
    flags.push("meaningless_answer");
  }

  if (context.extraction.topicShiftDetected) {
    flags.push("topic_shift_detected");
  }

  if (context.extraction.spamLikelihood >= 0.6) {
    flags.push("spam_suspected");
  }

  if (context.sentTooQuickly) {
    flags.push("rate_limit_warning");
  }

  if ((context.recentDuplicateCount ?? 0) > 0) {
    flags.push("repeated_message");
  }

  return flags;
}

function shouldEnterSpamGuard(context: StateMachineContext) {
  return (
    context.sentTooQuickly ||
    (context.recentDuplicateCount ?? 0) >= 2 ||
    context.extraction.spamLikelihood >= SPAM_GUARD_THRESHOLD
  );
}

function shouldRepair(context: StateMachineContext) {
  return (
    context.extraction.isMeaningless ||
    (context.extraction.confidence < MIN_MEANINGFUL_CONFIDENCE &&
      !context.extraction.refusalDetected)
  );
}

function hasKnownIntent(fields: LeadDraft) {
  return Boolean(fields.intent && fields.intent !== "unknown");
}

function buildConfirmationMessage(fields: LeadDraft) {
  const company = fields.company ?? fields.website ?? "your company";
  const intent = fields.intent ?? "your request";
  const urgency = fields.urgency ?? "bilinmiyor";
  const need = fields.needSummary ?? "details can be clarified in follow-up";

  return `Here is what I understood: ${company} reached out about ${intent}. Timing: ${urgency}. Need: ${need}. Should I send this to the team?`;
}

function result(
  previousStep: ChatStep,
  nextStep: ChatStep,
  collectedFields: LeadDraft,
  flags: ChatFlag[],
  options: {
    botMessage: string;
    isComplete?: boolean;
  }
): StateMachineResult {
  return {
    previousStep,
    nextStep,
    botMessage: options.botMessage,
    collectedFields,
    flags: uniqueFlags(flags),
    isComplete: options.isComplete ?? false,
  };
}

function addFlag(flags: ChatFlag[], flag: ChatFlag) {
  return uniqueFlags([...flags, flag]);
}

function uniqueFlags(flags: ChatFlag[]) {
  return Array.from(new Set(flags));
}
