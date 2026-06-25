"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BotMessageSquare,
  ChevronDown,
  Circle,
  MessageSquareText,
  Send,
  X,
} from "lucide-react";

import {
  ChatMessageBubble,
  type ChatBubbleSender,
  type ChatBubbleStatus,
} from "@/components/chatbot/chat-message-bubble";
import { Button } from "@/components/ui/button";
import type {
  ApiErrorResponse,
  CreateChatSessionResponse,
  SendChatMessageResponse,
} from "@/lib/domain/api";
import type { ChatFlag, ChatStep } from "@/lib/domain/chat";

type UiMessage = {
  id: string;
  sender: ChatBubbleSender;
  content: string;
  status?: ChatBubbleStatus;
  helperText?: string;
};

type ChatRuntimeState = {
  sessionId: string | null;
  currentStep: ChatStep | null;
  isComplete: boolean;
  leadId: string | null;
};

const progressSteps = ["Intent", "Company", "Need", "Contact"];

export function FloatingChatLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex flex-col items-end gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-[calc(100vw-2rem)]">
      {isOpen ? <ChatSheet onClose={() => setIsOpen(false)} /> : null}

      <Button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Minimize chatbot" : "Open chatbot"}
        className="h-12 rounded-lg bg-[#1f6f50] px-4 text-white shadow-[0_16px_40px_rgba(31,111,80,0.32)] hover:bg-[#185c42]"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <>
            <ChevronDown className="size-4" />
            Minimize
          </>
        ) : (
          <>
            <MessageSquareText className="size-4" />
            Chat with us
          </>
        )}
      </Button>
    </div>
  );
}

function ChatSheet({ onClose }: { onClose: () => void }) {
  const [runtime, setRuntime] = useState<ChatRuntimeState>({
    sessionId: null,
    currentStep: null,
    isComplete: false,
    leadId: null,
  });
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "session-starting",
      sender: "system",
      content: "Starting secure chat session.",
      status: "loading",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isStarting, setIsStarting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const startSession = useCallback(async () => {
    setIsStarting(true);
    setMessages([
      {
        id: "session-starting",
        sender: "system",
        content: "Starting secure chat session.",
        status: "loading",
      },
    ]);

    try {
      const response = await postJson<CreateChatSessionResponse>(
        "/api/chat/sessions",
        {
          source: "landing_page",
          metadata: {
            entryPoint: "floating_launcher",
          },
        }
      );

      setRuntime({
        sessionId: response.sessionId,
        currentStep: response.currentStep,
        isComplete: false,
        leadId: null,
      });
      setMessages([
        {
          id: createMessageId("bot"),
          sender: "bot",
          content: response.botMessage,
        },
      ]);
    } catch (error) {
      setRuntime({
        sessionId: null,
        currentStep: null,
        isComplete: false,
        leadId: null,
      });
      setMessages([
        {
          id: createMessageId("system-error"),
          sender: "system",
          content: getErrorMessage(error),
          status: "error",
          helperText: "This is recoverable. Use retry to start a fresh chat.",
        },
      ]);
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    startSession();
  }, [startSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const inputDisabled = isStarting || isSending || runtime.isComplete || !runtime.sessionId;
  const progress = useMemo(
    () => getProgressState(runtime.currentStep),
    [runtime.currentStep]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputValue.trim();

    if (!message) {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId("validation-error"),
          sender: "system",
          content: "Message is required.",
          status: "warning",
          helperText: "Write a short answer before sending.",
        },
      ]);
      return;
    }

    if (message.length > 2000) {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId("validation-error"),
          sender: "system",
          content: "Message is too long.",
          status: "warning",
          helperText: "Please keep your answer under 2,000 characters.",
        },
      ]);
      return;
    }

    if (inputDisabled || !runtime.sessionId) {
      return;
    }

    setInputValue("");
    setIsSending(true);
    setMessages((current) => [
      ...current,
      {
        id: createMessageId("user"),
        sender: "user",
        content: message,
      },
      {
        id: "bot-loading",
        sender: "bot",
        content: "",
        status: "loading",
      },
    ]);

    try {
      const response = await postJson<SendChatMessageResponse>(
        "/api/chat/messages",
        {
          sessionId: runtime.sessionId,
          message,
          clientStep: runtime.currentStep ?? undefined,
        }
      );
      const botStatus: ChatBubbleStatus = response.flags.includes("fallback_used")
        ? "fallback"
        : "idle";

      setRuntime({
        sessionId: response.sessionId,
        currentStep: response.nextStep,
        isComplete: response.isComplete,
        leadId: response.leadId ?? null,
      });
      setMessages((current) => [
        ...current.filter((item) => item.id !== "bot-loading"),
        {
          id: createMessageId("bot"),
          sender: "bot",
          content: response.botMessage,
          status: botStatus,
          helperText: getFallbackHelperText(response.flags),
        },
        ...buildFlagMessages(response.flags),
        ...(response.isComplete
          ? [
              {
                id: createMessageId("system-complete"),
                sender: "system" as const,
                content: response.leadId
                  ? "Lead saved for sales review."
                  : "Conversation completed.",
                helperText: response.leadId
                  ? `Lead ID: ${response.leadId}`
                  : undefined,
              },
            ]
          : []),
      ]);
    } catch (error) {
      setInputValue(message);
      setMessages((current) => [
        ...current.filter((item) => item.id !== "bot-loading"),
        {
          id: createMessageId("system-error"),
          sender: "system",
          content: getErrorMessage(error),
          status: "error",
          helperText: "Your message was not sent. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      aria-label="NextReach chatbot"
      className="flex h-[calc(100svh-6.5rem)] w-full flex-col overflow-hidden rounded-lg border border-[#cfd8c8] bg-white shadow-[0_24px_80px_rgba(23,33,27,0.22)] sm:h-[min(40rem,calc(100vh-7rem))] sm:w-[min(25rem,calc(100vw-2rem))]"
    >
      <ChatHeader onClose={onClose} />
      <ChatProgress currentIndex={progress.index} label={progress.label} />
      <MessagesArea messages={messages} bottomRef={bottomRef} />
      <ChatInput
        disabled={inputDisabled}
        isComplete={runtime.isComplete}
        canRetry={!runtime.sessionId && !isStarting}
        onSubmit={handleSubmit}
        onRetry={startSession}
        value={inputValue}
        onChange={setInputValue}
      />
      <ChatFooter isComplete={runtime.isComplete} leadId={runtime.leadId} />
    </section>
  );
}

function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-[#26392d] bg-[#17211b] px-4 py-3 text-white">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-white/10">
          <BotMessageSquare className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">NextReach assistant</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#a8c7b7]">
            <span className="size-1.5 rounded-full bg-[#74d29e]" />
            Lead qualification
          </div>
        </div>
      </div>

      <Button
        aria-label="Close chatbot"
        className="text-white hover:bg-white/10"
        onClick={onClose}
        size="icon"
        variant="ghost"
      >
        <X className="size-4" />
      </Button>
    </header>
  );
}

function ChatProgress({
  currentIndex,
  label,
}: {
  currentIndex: number;
  label: string;
}) {
  return (
    <div className="shrink-0 border-b border-[#e4e9e0] bg-[#fbfcfa] px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[#17211b]">Qualification progress</span>
        <span className="text-[#66736a]">{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {progressSteps.map((step, index) => (
          <div key={step}>
            <div
              className={
                index <= currentIndex
                  ? "h-1.5 rounded-full bg-[#1f6f50]"
                  : "h-1.5 rounded-full bg-[#dfe5db]"
              }
            />
            <div className="mt-1 truncate text-[0.68rem] text-[#66736a]">
              {step}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesArea({
  messages,
  bottomRef,
}: {
  messages: UiMessage[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8f5] px-3 py-3 sm:px-4 sm:py-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <ChatMessageBubble
            content={message.content}
            helperText={message.helperText}
            key={message.id}
            sender={message.sender}
            status={message.status}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ChatInput({
  disabled,
  isComplete,
  canRetry,
  onSubmit,
  onRetry,
  value,
  onChange,
}: {
  disabled: boolean;
  isComplete: boolean;
  canRetry: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  value: string;
  onChange: (value: string) => void;
}) {
  if (canRetry) {
    return (
      <div className="shrink-0 border-t border-[#e4e9e0] bg-white p-3">
        <Button
          className="w-full bg-[#1f6f50] text-white hover:bg-[#185c42]"
          onClick={onRetry}
        >
          Retry chat session
        </Button>
      </div>
    );
  }

  return (
    <form
      className="shrink-0 border-t border-[#e4e9e0] bg-white p-3"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="chat-message">
        Chat message
      </label>
      <div className="flex items-end gap-2 rounded-lg border border-[#cfd8c8] bg-[#fbfcfa] p-2">
        <textarea
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-base leading-5 text-[#17211b] outline-none placeholder:text-[#7a867d] disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
          disabled={disabled}
          id="chat-message"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={isComplete ? "Conversation completed" : "Type your answer..."}
          rows={1}
          value={value}
        />
        <Button
          aria-label="Send message"
          className="bg-[#1f6f50] text-white hover:bg-[#185c42]"
          disabled={disabled || value.trim().length === 0}
          size="icon"
          type="submit"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function ChatFooter({
  isComplete,
  leadId,
}: {
  isComplete: boolean;
  leadId: string | null;
}) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e4e9e0] bg-[#fbfcfa] px-4 py-2 text-xs text-[#66736a]">
      <span className="flex min-w-0 items-center gap-1.5">
        <Circle className="size-2 fill-[#1f6f50] text-[#1f6f50]" />
        {isComplete ? "Lead captured" : "Secure lead capture"}
      </span>
      <span className="truncate">{leadId ? `Lead ${leadId.slice(0, 8)}` : "Avg. 2 min"}</span>
    </footer>
  );
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(isApiErrorResponse(payload) ? payload.error.message : "Request failed.");
  }

  return payload as TResponse;
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as ApiErrorResponse).error.message === "string"
  );
}

function getProgressState(step: ChatStep | null) {
  if (!step) {
    return {
      index: 0,
      label: "Starting",
    };
  }

  if (step === "COMPANY_CONTEXT") {
    return { index: 1, label: "Step 2 of 4" };
  }

  if (step === "NEED_DETAILS" || step === "URGENCY") {
    return { index: 2, label: "Step 3 of 4" };
  }

  if (step === "CONTACT_INFO" || step === "CONFIRMATION" || step === "COMPLETE") {
    return { index: 3, label: step === "COMPLETE" ? "Complete" : "Step 4 of 4" };
  }

  return {
    index: 0,
    label: "Step 1 of 4",
  };
}

function getFallbackHelperText(flags: ChatFlag[]) {
  return flags.includes("fallback_used")
    ? "Fallback extraction kept the conversation moving."
    : undefined;
}

function buildFlagMessages(flags: ChatFlag[]): UiMessage[] {
  const messages: UiMessage[] = [];

  if (flags.includes("company_skipped")) {
    messages.push(createSystemMessage({
      content: "No problem, we can continue without company details.",
      helperText: "Sharing a website or company later will help sales route the lead.",
    }));
  }

  if (flags.includes("missing_contact")) {
    messages.push(createSystemMessage({
      content: "You can skip contact details for now.",
      helperText: "The team may not be able to follow up without an email.",
      status: "warning",
    }));
  }

  if (flags.includes("topic_shift_detected")) {
    messages.push(createSystemMessage({
      content: "I noticed the topic changed.",
      helperText: "I will still keep the conversation on the qualification path.",
      status: "warning",
    }));
  }

  if (flags.includes("meaningless_answer") || flags.includes("low_confidence")) {
    messages.push(createSystemMessage({
      content: "I could not understand that answer clearly.",
      helperText: "A short sentence is enough. For example: pricing, demo, or integration.",
      status: "warning",
    }));
  }

  if (flags.includes("invalid_email")) {
    messages.push(createSystemMessage({
      content: "That does not look like a valid email address.",
      helperText: "Please use a format like name@company.com.",
      status: "warning",
    }));
  }

  if (flags.includes("fallback_used") || flags.includes("ai_extraction_failed")) {
    messages.push(createSystemMessage({
      content: "AI extraction was unavailable, so I used the fallback parser.",
      helperText: "The conversation can continue normally.",
      status: "fallback",
    }));
  }

  if (
    flags.includes("rate_limit_warning") ||
    flags.includes("repeated_message") ||
    flags.includes("spam_suspected")
  ) {
    messages.push(createSystemMessage({
      content: "Please slow down and send one clear answer at a time.",
      helperText: "Repeated or very fast messages may be treated as spam.",
      status: "warning",
    }));
  }

  return dedupeSystemMessages(messages);
}

function createSystemMessage({
  content,
  helperText,
  status = "idle",
}: {
  content: string;
  helperText?: string;
  status?: ChatBubbleStatus;
}): UiMessage {
  return {
    id: createMessageId("system-flag"),
    sender: "system",
    content,
    helperText,
    status,
  };
}

function dedupeSystemMessages(messages: UiMessage[]) {
  const seen = new Set<string>();

  return messages.filter((message) => {
    const key = `${message.status}:${message.content}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected chatbot error.";
}

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
