import {
  AlertTriangle,
  Filter,
  MailQuestion,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { AdminContentShell, AdminShell } from "@/components/admin/admin-shell";
import { LeadFilters } from "@/components/admin/lead-filters";
import { LeadTable } from "@/components/admin/lead-table";
import { Button } from "@/components/ui/button";

const metrics = [
  {
    label: "New leads",
    value: "24",
    detail: "Awaiting review",
    helper: "Primary queue",
    icon: Sparkles,
    tone: "green",
  },
  {
    label: "High quality",
    value: "11",
    detail: "Score 6+",
    helper: "Prioritize today",
    icon: ShieldAlert,
    tone: "blue",
  },
  {
    label: "Missing contact",
    value: "5",
    detail: "No valid email",
    helper: "Manual review",
    icon: MailQuestion,
    tone: "amber",
  },
  {
    label: "Spam flagged",
    value: "3",
    detail: "Rate or content risk",
    helper: "Check first",
    icon: AlertTriangle,
    tone: "red",
  },
];

export default function AdminPage() {
  return (
    <AdminShell
      actions={
        <>
          <Button
            className="border-[#dfe5db] bg-white text-[#17211b] hover:bg-[#eef2eb]"
            variant="outline"
          >
            <Filter className="size-4" />
            Filters
          </Button>
          <Button className="bg-[#1f6f50] text-white hover:bg-[#185c42]">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </>
      }
      description="Review qualified chatbot leads, inspect intent and quality, then update sales follow-up status."
      title="Lead inbox"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="mt-5">
        <AdminContentShell>
          <div className="flex flex-col gap-3 border-b border-[#dfe5db] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#101813]">
                Recent leads
              </h2>
              <p className="mt-1 text-sm text-[#66736a]">
                API-backed list view will render inside this content shell.
              </p>
            </div>
          </div>
          <LeadFilters />
          <LeadTable />
        </AdminContentShell>
      </div>
    </AdminShell>
  );
}

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  const Icon = metric.icon;
  const tone = getMetricTone(metric.tone);

  return (
    <div className="rounded-lg border border-[#dfe5db] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#536158]">{metric.label}</div>
          <div className="mt-2 text-3xl font-semibold text-[#101813]">
            {metric.value}
          </div>
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${tone.iconBg} ${tone.iconText}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-[#66736a]">{metric.detail}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${tone.badgeBg} ${tone.badgeText}`}
        >
          {metric.helper}
        </span>
      </div>
    </div>
  );
}

function getMetricTone(tone: string) {
  if (tone === "blue") {
    return {
      iconBg: "bg-[#e7f0ff]",
      iconText: "text-[#2457a6]",
      badgeBg: "bg-[#e7f0ff]",
      badgeText: "text-[#2457a6]",
    };
  }

  if (tone === "amber") {
    return {
      iconBg: "bg-[#fff3df]",
      iconText: "text-[#a96312]",
      badgeBg: "bg-[#fff3df]",
      badgeText: "text-[#8a5b21]",
    };
  }

  if (tone === "red") {
    return {
      iconBg: "bg-[#fff0ed]",
      iconText: "text-[#b43224]",
      badgeBg: "bg-[#fff0ed]",
      badgeText: "text-[#9b3325]",
    };
  }

  return {
    iconBg: "bg-[#e7f4ed]",
    iconText: "text-[#1f6f50]",
    badgeBg: "bg-[#e7f4ed]",
    badgeText: "text-[#1f6f50]",
  };
}
