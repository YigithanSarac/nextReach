import {
  ArrowRight,
  BotMessageSquare,
  CheckCircle2,
  Clock3,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { FloatingChatLauncher } from "@/components/chatbot/floating-chat-launcher";
import { Button } from "@/components/ui/button";

const navigationItems = ["Product", "Use cases", "Admin", "Contact"];

const metrics = [
  { label: "Qualified leads", value: "128" },
  { label: "High intent", value: "42%" },
  { label: "Avg. reply time", value: "1.8m" },
];

const leads = [
  {
    company: "Northstar Goods",
    intent: "Pricing",
    score: 8,
    status: "High fit",
    summary: "Shopify team asking for conversion analytics and monthly pricing.",
  },
  {
    company: "MetricLane",
    intent: "Demo",
    score: 7,
    status: "Ready",
    summary: "Needs product-level dashboards before a Q3 rollout.",
  },
  {
    company: "Orbit Retail",
    intent: "Integration",
    score: 6,
    status: "Missing contact",
    summary: "Looking for GA4 and ecommerce platform data connection.",
  },
  {
    company: "Unknown visitor",
    intent: "Unknown",
    score: 2,
    status: "Spam flagged",
    summary: "Repeated low-confidence answers kept for manual review.",
  },
];

const useCases = [
  {
    icon: BotMessageSquare,
    title: "Replace static contact forms",
    description:
      "Guide visitors through a short qualification flow instead of waiting for a vague form submission.",
  },
  {
    icon: Gauge,
    title: "Prioritize sales follow-up",
    description:
      "Score each lead with deterministic rules so the team can focus on urgent, high-fit conversations first.",
  },
  {
    icon: ShieldCheck,
    title: "Keep qualification explainable",
    description:
      "Store extracted fields, confidence, flags, transcript, and scoring breakdown for every lead.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17211b]">
      <Header />
      <Hero />
      <DashboardPreview />
      <UseCases />
      <Cta />
      <FloatingChatLauncher />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe5db] bg-[#f7f8f5]/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#17211b] text-white">
            <MessageSquareText className="size-5" />
          </div>
          <span className="text-base font-semibold">NextReach</span>
        </div>

        <nav className="hidden items-center gap-7 text-sm text-[#536158] md:flex">
          {navigationItems.map((item) => (
            <a className="transition hover:text-[#17211b]" href="#" key={item}>
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button className="hidden bg-white text-[#17211b] hover:bg-[#eef2eb] lg:inline-flex" variant="outline">
            Admin preview
          </Button>
          <Button className="h-9 bg-[#1f6f50] px-3 text-white hover:bg-[#185c42] sm:h-10 sm:px-4">
            <span className="hidden sm:inline">Start demo</span>
            <span className="sm:hidden">Demo</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-[#dfe5db]">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-7xl content-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-[#cfd8c8] bg-white px-3 py-1 text-sm text-[#536158]">
            <Sparkles className="size-4 text-[#b36b21]" />
            <span className="truncate">Conversational lead qualification</span>
          </div>
          <h1 className="text-4xl font-semibold leading-[1.06] tracking-normal text-[#101813] sm:text-5xl lg:text-7xl">
            Turn landing page visitors into sales-ready leads.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#536158] sm:text-lg sm:leading-8">
            NextReach asks the right questions, extracts structured buying
            signals, scores each lead, and gives sales a clean admin view with
            the full conversation history.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button className="h-11 w-full bg-[#1f6f50] px-4 text-white hover:bg-[#185c42] sm:w-auto">
              Qualify a lead
              <ArrowRight className="size-4" />
            </Button>
            <Button className="h-11 w-full border-[#cfd8c8] bg-white px-4 text-[#17211b] hover:bg-[#eef2eb] sm:w-auto" variant="outline">
              View workflow
            </Button>
          </div>

          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div className="border-l border-[#cfd8c8] pl-4 sm:pl-3" key={metric.label}>
                <div className="text-2xl font-semibold text-[#101813]">
                  {metric.value}
                </div>
                <div className="mt-1 text-sm text-[#66736a]">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 items-center">
          <ChatPreview />
        </div>
      </div>
    </section>
  );
}

function ChatPreview() {
  return (
    <div className="w-full rounded-lg border border-[#cfd8c8] bg-white shadow-[0_24px_80px_rgba(23,33,27,0.12)]">
      <div className="flex items-center justify-between border-b border-[#e4e9e0] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#e7f4ed] text-[#1f6f50]">
            <BotMessageSquare className="size-4" />
          </div>
          <div>
            <div className="text-sm font-medium">NextReach assistant</div>
            <div className="text-xs text-[#66736a]">Deterministic flow active</div>
          </div>
        </div>
        <div className="rounded-full bg-[#e7f4ed] px-2 py-1 text-xs font-medium text-[#1f6f50]">
          Online
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="max-w-[82%] rounded-lg bg-[#eef2eb] px-4 py-3 text-sm leading-6 text-[#27332b]">
          Are you interested in pricing, a demo, integration, or something else?
        </div>
        <div className="ml-auto max-w-[78%] rounded-lg bg-[#1f6f50] px-4 py-3 text-sm leading-6 text-white">
          Pricing for our Shopify analytics team. We need this this month.
        </div>
        <div className="rounded-lg border border-[#efd4a4] bg-[#fff9ed] px-4 py-3 text-sm leading-6 text-[#6f4619]">
          AI extraction can fall back to deterministic parsing without stopping
          the conversation.
        </div>
        <div className="rounded-lg border border-[#e4e9e0] bg-[#fbfcfa] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-4 text-[#1f6f50]" />
            Extracted signals
          </div>
          <div className="grid gap-2 text-sm">
            <SignalRow label="Intent" value="Pricing" />
            <SignalRow label="Urgency" value="This month" />
            <SignalRow label="Lead score" value="8 / 10" />
          </div>
        </div>
        <div className="max-w-[82%] rounded-lg bg-[#eef2eb] px-4 py-3 text-sm leading-6 text-[#27332b]">
          Can you share your company name or website so I can route this correctly?
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#1f6f50]">
              <LayoutDashboard className="size-4" />
              Sales admin workspace
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-normal text-[#101813] sm:text-4xl">
              Every lead arrives with context sales can act on.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[#66736a]">
            The admin panel is designed for scanning: score, intent, urgency,
            summary, and transcript are visible without asking sales to inspect
            raw chatbot logs first.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#dfe5db] bg-[#f7f8f5]">
          <div className="min-w-[44rem]">
            <div className="grid border-b border-[#dfe5db] bg-[#17211b] px-4 py-3 text-xs font-medium uppercase text-[#c7d1c5] sm:grid-cols-[1.1fr_0.8fr_0.6fr_0.7fr_1.7fr]">
              <span>Company</span>
              <span className="hidden sm:block">Intent</span>
              <span className="hidden sm:block">Score</span>
              <span className="hidden sm:block">Status</span>
              <span className="hidden sm:block">Summary</span>
            </div>
            <div className="divide-y divide-[#dfe5db]">
              {leads.map((lead) => (
                <div
                  className="grid gap-3 bg-white px-4 py-4 text-sm sm:grid-cols-[1.1fr_0.8fr_0.6fr_0.7fr_1.7fr] sm:items-center"
                  key={lead.company}
                >
                  <div>
                    <div className="font-medium text-[#101813]">{lead.company}</div>
                    <div className="mt-1 text-xs text-[#66736a] sm:hidden">
                      {lead.intent} - score {lead.score}
                    </div>
                  </div>
                  <div className="hidden text-[#536158] sm:block">{lead.intent}</div>
                  <div className="hidden sm:block">
                    <span className="rounded-full bg-[#e7f4ed] px-2 py-1 text-xs font-medium text-[#1f6f50]">
                      {lead.score}/10
                    </span>
                  </div>
                  <div className="hidden text-[#536158] sm:block">{lead.status}</div>
                  <div className="text-[#66736a]">{lead.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section className="border-y border-[#dfe5db] bg-[#eef2eb] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-normal text-[#101813] sm:text-4xl">
            Built for the moments where forms lose context.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#66736a]">
            NextReach keeps the experience lightweight for visitors while
            preserving enough structure for sales operations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {useCases.map((item) => {
            const Icon = item.icon;

            return (
              <article
                className="rounded-lg border border-[#d6dfd1] bg-white p-5"
                key={item.title}
              >
                <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-[#fff3df] text-[#b36b21]">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#101813]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#66736a]">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="bg-[#17211b] py-16 text-white sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#a8c7b7]">
            <Clock3 className="size-4" />
            From visitor message to sales queue
          </div>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
            Capture the conversation, qualify the lead, and give sales the next
            best action.
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <Button className="h-11 w-full bg-white px-4 text-[#17211b] hover:bg-[#eef2eb] sm:w-auto">
            Open chatbot
            <ArrowRight className="size-4" />
          </Button>
          <Button className="h-11 w-full border-[#395044] bg-transparent px-4 text-white hover:bg-[#22362b] sm:w-auto" variant="outline">
            Review admin flow
            <UsersRound className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#66736a]">{label}</span>
      <span className="font-medium text-[#17211b]">{value}</span>
    </div>
  );
}
