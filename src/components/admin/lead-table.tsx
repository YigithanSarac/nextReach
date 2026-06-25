"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Building2, Mail, Phone, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  AdminLeadDetailResponse,
  AdminLeadListItem,
  AdminLeadListResponse,
  ApiErrorResponse,
  UpdateLeadResponse,
} from "@/lib/domain/api";
import type { LeadStatus } from "@/lib/domain/lead";

type LeadDetailTab =
  | "summary"
  | "contact"
  | "qualification"
  | "transcript"
  | "ai";

const detailTabs: Array<{ label: string; value: LeadDetailTab }> = [
  { label: "Summary", value: "summary" },
  { label: "Contact", value: "contact" },
  { label: "Qualification", value: "qualification" },
  { label: "Transcript", value: "transcript" },
  { label: "AI extraction", value: "ai" },
];

const statusOptions: Array<{ label: string; value: LeadStatus }> = [
  { label: "New", value: "new" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Archived", value: "archived" },
  { label: "Spam", value: "spam" },
];

export function LeadTable() {
  const [rows, setRows] = useState<AdminLeadListItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLeads() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchJson<AdminLeadListResponse>(
        "/api/admin/leads?limit=50"
      );

      setRows(response.items);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialLeads() {
      try {
        const response = await fetchJson<AdminLeadListResponse>(
          "/api/admin/leads?limit=50"
        );

        if (isMounted) {
          setRows(response.items);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialLeads();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleLeadUpdated(update: UpdateLeadResponse) {
    setRows((current) =>
      current.map((row) =>
        row.id === update.id ? { ...row, status: update.status } : row
      )
    );
  }

  return (
    <>
      <div>
        <div className="hidden grid-cols-[1.2fr_1.2fr_0.75fr_0.75fr_0.7fr_0.65fr_0.75fr] border-b border-[#dfe5db] bg-[#17211b] px-4 py-3 text-xs font-medium uppercase text-[#c7d1c5] lg:grid">
          <span>Company</span>
          <span>Contact</span>
          <span>Status</span>
          <span>Quality</span>
          <span>Intent</span>
          <span>Urgency</span>
          <span>Score</span>
        </div>

        {isLoading ? (
          <TableLoadingRows />
        ) : error ? (
          <TableStateMessage
            actionLabel="Try again"
            message={error}
            onAction={loadLeads}
            tone="error"
          />
        ) : rows.length === 0 ? (
          <TableStateMessage
            message="No leads found yet."
            helperText="Complete a chatbot conversation from the landing page to create the first lead."
          />
        ) : (
          <div className="divide-y divide-[#dfe5db]">
            {rows.map((row) => (
              <button
                className="grid w-full gap-3 px-4 py-4 text-left text-sm transition hover:bg-[#f7f8f5] sm:gap-4 lg:grid-cols-[1.2fr_1.2fr_0.75fr_0.75fr_0.7fr_0.65fr_0.75fr] lg:items-center"
                key={row.id}
                onClick={() => setSelectedLeadId(row.id)}
                type="button"
              >
                <LeadRow row={row} />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLeadId ? (
        <LeadDetailDrawer
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdated={handleLeadUpdated}
        />
      ) : null}
    </>
  );
}

function LeadRow({ row }: { row: AdminLeadListItem }) {
  return (
    <>
      <div className="min-w-0">
        <div className="truncate font-medium text-[#101813]">
          {row.company ?? "Unknown company"}
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#66736a] lg:hidden">
          <span>{labelValue(row.intent)}</span>
          <span>{labelValue(row.urgency)}</span>
          <span>{row.score}/10</span>
        </div>
      </div>

      <ContactCell
        email={row.email}
        name={row.name}
        phone={null}
      />

      <div>
        <StatusBadge status={row.status} />
      </div>

      <div>
        <QualityBadge quality={row.quality} />
      </div>

      <div className="hidden text-[#536158] lg:block">{labelValue(row.intent)}</div>
      <div className="hidden text-[#536158] lg:block">{labelValue(row.urgency)}</div>
      <ScoreCell score={row.score} />
    </>
  );
}

function LeadDetailDrawer({
  leadId,
  onClose,
  onUpdated,
}: {
  leadId: string;
  onClose: () => void;
  onUpdated: (update: UpdateLeadResponse) => void;
}) {
  const [activeTab, setActiveTab] = useState<LeadDetailTab>("summary");
  const [lead, setLead] = useState<AdminLeadDetailResponse | null>(null);
  const [draftStatus, setDraftStatus] = useState<LeadStatus>("new");
  const [draftNotes, setDraftNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function loadLeadDetail() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchJson<AdminLeadDetailResponse>(
        `/api/admin/leads/${leadId}`
      );

      setLead(response);
      setDraftStatus(response.status);
      setDraftNotes(response.notes ?? "");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialLeadDetail() {
      try {
        const response = await fetchJson<AdminLeadDetailResponse>(
          `/api/admin/leads/${leadId}`
        );

        if (!isMounted) {
          return;
        }

        setLead(response);
        setDraftStatus(response.status);
        setDraftNotes(response.notes ?? "");
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialLeadDetail();

    return () => {
      isMounted = false;
    };
  }, [leadId]);

  const hasChanges = useMemo(() => {
    if (!lead) {
      return false;
    }

    return draftStatus !== lead.status || draftNotes !== (lead.notes ?? "");
  }, [draftNotes, draftStatus, lead]);

  async function handleSave() {
    if (!lead || !hasChanges) {
      return;
    }

    if (draftNotes.length > 5000) {
      setError("Notes must be 5,000 characters or fewer.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const update = await patchJson<UpdateLeadResponse>(
        `/api/admin/leads/${lead.id}`,
        {
          status: draftStatus,
          notes: draftNotes.trim() ? draftNotes : null,
        }
      );

      setLead((current) =>
        current
          ? {
              ...current,
              status: update.status,
              updatedAt: update.updatedAt,
              notes: update.notes,
            }
          : current
      );
      setDraftNotes(update.notes ?? "");
      setDraftStatus(update.status);
      setSaveMessage("Lead updated.");
      onUpdated(update);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close lead detail"
        className="absolute inset-0 bg-[#17211b]/35"
        onClick={onClose}
        type="button"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-[-24px_0_80px_rgba(23,33,27,0.18)] sm:max-w-xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#dfe5db] px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm text-[#66736a]">
              <Building2 className="size-4" />
              Lead detail
            </div>
            <h2 className="truncate text-xl font-semibold text-[#101813]">
              {lead?.company ?? "Loading lead..."}
            </h2>
            <p className="mt-1 text-sm text-[#66736a]">
              {lead?.leadSummary ?? "Loading qualification summary."}
            </p>
          </div>
          <Button
            aria-label="Close drawer"
            className="shrink-0 border-[#dfe5db] bg-white text-[#17211b] hover:bg-[#eef2eb]"
            onClick={onClose}
            size="icon"
            variant="outline"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex gap-2 overflow-x-auto border-b border-[#dfe5db] px-4 py-3 sm:px-5">
          {detailTabs.map((tab) => (
            <button
              className={
                activeTab === tab.value
                  ? "shrink-0 rounded-lg bg-[#17211b] px-3 py-2 text-sm font-medium text-white"
                  : "shrink-0 rounded-lg border border-[#dfe5db] bg-[#f7f8f5] px-3 py-2 text-sm font-medium text-[#536158] hover:bg-[#eef2eb] hover:text-[#17211b]"
              }
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {isLoading ? <DrawerLoadingState /> : null}
          {error ? (
            <TableStateMessage
              actionLabel="Retry"
              message={error}
              onAction={loadLeadDetail}
              tone="error"
            />
          ) : null}
          {lead && !isLoading ? (
            <div className="space-y-5">
              <StatusNotesEditor
                draftNotes={draftNotes}
                draftStatus={draftStatus}
                hasChanges={hasChanges}
                isSaving={isSaving}
                onNotesChange={setDraftNotes}
                onSave={handleSave}
                onStatusChange={setDraftStatus}
                saveMessage={saveMessage}
              />
              {activeTab === "summary" ? <SummaryTab lead={lead} /> : null}
              {activeTab === "contact" ? <ContactTab lead={lead} /> : null}
              {activeTab === "qualification" ? <QualificationTab lead={lead} /> : null}
              {activeTab === "transcript" ? <TranscriptTab lead={lead} /> : null}
              {activeTab === "ai" ? <AiExtractionTab lead={lead} /> : null}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function StatusNotesEditor({
  draftStatus,
  draftNotes,
  hasChanges,
  isSaving,
  saveMessage,
  onStatusChange,
  onNotesChange,
  onSave,
}: {
  draftStatus: LeadStatus;
  draftNotes: string;
  hasChanges: boolean;
  isSaving: boolean;
  saveMessage: string | null;
  onStatusChange: (status: LeadStatus) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#dfe5db] bg-[#f7f8f5] p-4">
      <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[#101813]">Status</span>
          <select
            className="h-10 rounded-lg border border-[#dfe5db] bg-white px-3 text-sm text-[#17211b] outline-none"
            onChange={(event) => onStatusChange(event.target.value as LeadStatus)}
            value={draftStatus}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[#101813]">Admin notes</span>
          <textarea
            className="min-h-20 resize-none rounded-lg border border-[#dfe5db] bg-white px-3 py-2 text-sm text-[#17211b] outline-none placeholder:text-[#7a867d]"
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add sales follow-up notes..."
            value={draftNotes}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-[#66736a]">
          {saveMessage ?? "Changes are saved to the lead record."}
        </span>
        <Button
          className="w-full bg-[#1f6f50] text-white hover:bg-[#185c42] sm:w-auto"
          disabled={!hasChanges || isSaving}
          onClick={onSave}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function SummaryTab({ lead }: { lead: AdminLeadDetailResponse }) {
  return (
    <div className="space-y-4">
      <InfoBlock label="Lead summary" value={lead.leadSummary ?? "No summary"} />
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoBlock label="Status" value={labelValue(lead.status)} />
        <InfoBlock label="Quality" value={labelValue(lead.quality)} />
        <InfoBlock label="Score" value={`${lead.score}/10`} />
      </div>
    </div>
  );
}

function ContactTab({ lead }: { lead: AdminLeadDetailResponse }) {
  return (
    <div className="space-y-3">
      <InfoBlock label="Name" value={lead.name ?? "Missing"} />
      <InfoBlock label="Email" value={lead.email ?? "Missing"} />
      <InfoBlock label="Phone" value={lead.phone ?? "Missing"} />
      <InfoBlock label="Website" value={lead.website ?? "Missing"} />
    </div>
  );
}

function QualificationTab({ lead }: { lead: AdminLeadDetailResponse }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoBlock label="Intent" value={labelValue(lead.intent)} />
        <InfoBlock label="Urgency" value={labelValue(lead.urgency)} />
        <InfoBlock label="Platform" value={lead.platform ?? "Unknown"} />
        <InfoBlock
          label="Missing fields"
          value={lead.missingFields.join(", ") || "None"}
        />
      </div>
      <div className="rounded-lg border border-[#dfe5db] bg-[#f7f8f5] p-4">
        <div className="mb-2 text-sm font-medium text-[#101813]">Score</div>
        <ScoreCell score={lead.score} />
      </div>
    </div>
  );
}

function TranscriptTab({ lead }: { lead: AdminLeadDetailResponse }) {
  if (lead.messages.length === 0) {
    return <TableStateMessage message="No transcript found for this lead." />;
  }

  return (
    <div className="space-y-3">
      {lead.messages.map((message, index) => (
        <div
          className={
            message.sender === "user"
              ? "ml-auto max-w-[82%] rounded-lg bg-[#1f6f50] px-4 py-3 text-sm leading-6 text-white"
              : "max-w-[86%] rounded-lg bg-[#f7f8f5] px-4 py-3 text-sm leading-6 text-[#27332b] ring-1 ring-[#dfe5db]"
          }
          key={`${message.sender}-${message.createdAt}-${index}`}
        >
          {message.content}
        </div>
      ))}
    </div>
  );
}

function AiExtractionTab({ lead }: { lead: AdminLeadDetailResponse }) {
  const fields = Object.entries(lead.extractedFields);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-[#dfe5db] bg-[#f7f8f5] p-4">
        <BrainCircuit className="size-5 text-[#1f6f50]" />
        <div>
          <div className="text-sm font-medium text-[#101813]">AI extraction</div>
          <div className="text-xs text-[#66736a]">
            Summary source: {String(lead.aiSummary.source ?? "unknown")}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {fields.length > 0 ? (
          fields.map(([key, field]) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-[#dfe5db] px-3 py-2 text-sm"
              key={key}
            >
              <span className="text-[#66736a]">{labelValue(key)}</span>
              <span className="text-right font-medium text-[#101813]">
                {String(field?.value ?? "Unknown")}
                {field?.confidence !== null && field?.confidence !== undefined
                  ? ` (${Math.round(field.confidence * 100)}%)`
                  : ""}
              </span>
            </div>
          ))
        ) : (
          <TableStateMessage message="No extracted field metadata found." />
        )}
      </div>

      <InfoBlock
        label="Flags"
        value={lead.spamFlags.length > 0 ? lead.spamFlags.join(", ") : "None"}
      />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dfe5db] bg-white p-4">
      <div className="text-xs font-medium uppercase text-[#66736a]">{label}</div>
      <div className="mt-2 text-sm leading-6 text-[#101813]">{value}</div>
    </div>
  );
}

function ContactCell({
  name,
  email,
  phone,
}: {
  name: string | null;
  email: string | null;
  phone: string | null;
}) {
  return (
    <div className="min-w-0 space-y-1 text-[#66736a]">
      <div className="flex min-w-0 items-center gap-2">
        <UserRound className="size-3.5 shrink-0" />
        <span className="truncate">{name ?? "No contact name"}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Mail className="size-3.5 shrink-0" />
        <span className="truncate">{email ?? "Missing email"}</span>
      </div>
      {phone ? (
        <div className="flex min-w-0 items-center gap-2">
          <Phone className="size-3.5 shrink-0" />
          <span className="truncate">{phone}</span>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const tone =
    status === "new"
      ? "bg-[#e7f4ed] text-[#1f6f50]"
      : status === "spam"
        ? "bg-[#fff0ed] text-[#9b3325]"
        : status === "archived"
          ? "bg-[#eef2eb] text-[#536158]"
          : "bg-[#e7f0ff] text-[#2457a6]";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
      {labelValue(status)}
    </span>
  );
}

function QualityBadge({ quality }: { quality: AdminLeadListItem["quality"] }) {
  const tone =
    quality === "high"
      ? "bg-[#e7f4ed] text-[#1f6f50]"
      : quality === "medium"
        ? "bg-[#fff3df] text-[#8a5b21]"
        : "bg-[#eef2eb] text-[#536158]";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
      {labelValue(quality)}
    </span>
  );
}

function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-[#dfe5db]">
        <div
          className="h-full rounded-full bg-[#1f6f50]"
          style={{ width: `${Math.min(score * 10, 100)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-[#101813]">{score}/10</span>
    </div>
  );
}

function TableStateMessage({
  message,
  helperText,
  actionLabel,
  onAction,
  tone = "default",
}: {
  message: string;
  helperText?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "px-4 py-8 text-sm text-[#9b3325]"
          : "px-4 py-8 text-sm text-[#66736a]"
      }
    >
      <div className="font-medium">{message}</div>
      {helperText ? <div className="mt-1 text-[#66736a]">{helperText}</div> : null}
      {actionLabel && onAction ? (
        <Button
          className="mt-4 border-[#dfe5db] bg-white text-[#17211b] hover:bg-[#eef2eb]"
          onClick={onAction}
          variant="outline"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function TableLoadingRows() {
  return (
    <div className="divide-y divide-[#dfe5db]">
      {[0, 1, 2].map((item) => (
        <div
          className="grid gap-3 px-4 py-4 sm:gap-4 lg:grid-cols-[1.2fr_1.2fr_0.75fr_0.75fr_0.7fr_0.65fr_0.75fr]"
          key={item}
        >
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              className="h-4 animate-pulse rounded-full bg-[#eef2eb]"
              key={`${item}-${index}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DrawerLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-lg bg-[#eef2eb]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded-lg bg-[#eef2eb]" />
        <div className="h-20 animate-pulse rounded-lg bg-[#eef2eb]" />
      </div>
    </div>
  );
}

async function fetchJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url);
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(isApiErrorResponse(payload) ? payload.error.message : "Request failed.");
  }

  return payload as TResponse;
}

async function patchJson<TResponse>(
  url: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "PATCH",
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected admin panel error.";
}

function labelValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
