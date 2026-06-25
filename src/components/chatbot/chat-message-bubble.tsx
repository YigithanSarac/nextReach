import {
  AlertCircle,
  BotMessageSquare,
  Info,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ChatBubbleSender = "bot" | "user" | "system";
export type ChatBubbleStatus = "idle" | "loading" | "error" | "fallback" | "warning";

export type ChatMessageBubbleProps = {
  sender: ChatBubbleSender;
  content?: string;
  status?: ChatBubbleStatus;
  helperText?: string;
};

export function ChatMessageBubble({
  sender,
  content,
  status = "idle",
  helperText,
}: ChatMessageBubbleProps) {
  if (sender === "system") {
    return (
      <SystemBubble content={content ?? ""} helperText={helperText} status={status} />
    );
  }

  const isUser = sender === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? <BubbleAvatar sender="bot" /> : null}
      <div className={cn("max-w-[82%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm leading-6",
            isUser
              ? "bg-[#1f6f50] text-white"
              : "bg-white text-[#27332b] shadow-sm ring-1 ring-[#e4e9e0]",
            status === "error" && "bg-[#fff7f5] text-[#7a2418] ring-[#f0c7bf]",
            status === "fallback" && "bg-[#fff9ed] text-[#6f4619] ring-[#efd4a4]",
            status === "warning" && "bg-[#fff9ed] text-[#6f4619] ring-[#efd4a4]"
          )}
        >
          {status === "loading" ? <TypingIndicator /> : content}
        </div>
        <BubbleMeta helperText={helperText} status={status} />
      </div>
      {isUser ? <BubbleAvatar sender="user" /> : null}
    </div>
  );
}

function SystemBubble({
  content,
  helperText,
  status,
}: {
  content: string;
  helperText?: string;
  status: ChatBubbleStatus;
}) {
  const Icon =
    status === "error"
      ? AlertCircle
      : status === "fallback"
        ? RotateCcw
        : status === "warning"
          ? AlertCircle
          : Info;

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "flex max-w-[92%] items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-5",
          status === "error"
            ? "border-[#f0c7bf] bg-[#fff7f5] text-[#7a2418]"
            : status === "fallback" || status === "warning"
              ? "border-[#efd4a4] bg-[#fff9ed] text-[#6f4619]"
              : "border-[#dfe5db] bg-white text-[#66736a]"
        )}
      >
        <Icon className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <div>{content}</div>
          {helperText ? <div className="mt-1 opacity-80">{helperText}</div> : null}
        </div>
      </div>
    </div>
  );
}

function BubbleAvatar({ sender }: { sender: "bot" | "user" }) {
  return (
    <div
      className={cn(
        "mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg",
        sender === "bot"
          ? "bg-[#e7f4ed] text-[#1f6f50]"
          : "bg-[#eef2eb] text-[#536158]"
      )}
    >
      {sender === "bot" ? (
        <BotMessageSquare className="size-3.5" />
      ) : (
        <UserRound className="size-3.5" />
      )}
    </div>
  );
}

function BubbleMeta({
  helperText,
  status,
}: {
  helperText?: string;
  status: ChatBubbleStatus;
}) {
  if (!helperText && status === "idle") {
    return null;
  }

  const fallbackText =
    status === "error"
      ? "Something went wrong. Please try again."
      : status === "fallback"
        ? "Fallback extraction was used."
        : status === "warning"
          ? "Please adjust your answer and continue."
        : null;

  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1.5 text-xs",
        status === "error"
          ? "text-[#9b3325]"
          : status === "fallback" || status === "warning"
            ? "text-[#8a5b21]"
            : "text-[#66736a]"
      )}
    >
      {status === "error" ? <AlertCircle className="size-3" /> : null}
      {status === "fallback" ? <RotateCcw className="size-3" /> : null}
      {status === "warning" ? <AlertCircle className="size-3" /> : null}
      <span>{helperText ?? fallbackText}</span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="size-3.5 animate-spin" />
      Thinking
    </span>
  );
}
