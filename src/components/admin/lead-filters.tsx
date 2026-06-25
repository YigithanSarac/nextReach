"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LeadIntent, LeadQuality, LeadStatus } from "@/lib/domain/lead";

type StatusFilter = "all" | LeadStatus;
type QualityFilter = "all" | LeadQuality;
type IntentFilter = "all" | LeadIntent;

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Archived", value: "archived" },
  { label: "Spam", value: "spam" },
];

const qualityOptions: Array<{ label: string; value: QualityFilter }> = [
  { label: "All quality", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const intentOptions: Array<{ label: string; value: IntentFilter }> = [
  { label: "All intents", value: "all" },
  { label: "Pricing", value: "pricing" },
  { label: "Demo", value: "demo" },
  { label: "Integration", value: "integration" },
  { label: "General", value: "general" },
  { label: "Other", value: "other" },
  { label: "Unknown", value: "unknown" },
];

export function LeadFilters() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [quality, setQuality] = useState<QualityFilter>("all");
  const [intent, setIntent] = useState<IntentFilter>("all");
  const hasActiveFilters =
    search.trim().length > 0 ||
    status !== "all" ||
    quality !== "all" ||
    intent !== "all";

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setQuality("all");
    setIntent("all");
  }

  return (
    <div className="border-b border-[#dfe5db] bg-white px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dfe5db] bg-[#f7f8f5] px-3 py-2">
          <Search className="size-4 shrink-0 text-[#66736a]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-[#17211b] outline-none placeholder:text-[#7a867d]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company, email, or summary"
            value={search}
          />
          {search ? (
            <button
              aria-label="Clear search"
              className="text-[#66736a] transition hover:text-[#17211b]"
              onClick={() => setSearch("")}
              type="button"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Quality"
            onChange={(value) => setQuality(value as QualityFilter)}
            options={qualityOptions}
            value={quality}
          />
          <FilterSelect
            label="Intent"
            onChange={(value) => setIntent(value as IntentFilter)}
            options={intentOptions}
            value={intent}
          />
          <Button
            className="border-[#dfe5db] bg-white text-[#17211b] hover:bg-[#eef2eb]"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
            variant="outline"
          >
            <SlidersHorizontal className="size-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {statusOptions.map((option) => (
          <button
            className={
              status === option.value
                ? "shrink-0 rounded-lg bg-[#17211b] px-3 py-2 text-sm font-medium text-white"
                : "shrink-0 rounded-lg border border-[#dfe5db] bg-[#f7f8f5] px-3 py-2 text-sm font-medium text-[#536158] hover:bg-[#eef2eb] hover:text-[#17211b]"
            }
            key={option.value}
            onClick={() => setStatus(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-[#dfe5db] bg-white px-3 py-2 text-sm text-[#536158]">
      <span className="hidden sm:inline">{label}</span>
      <select
        className="bg-transparent text-sm font-medium text-[#17211b] outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
