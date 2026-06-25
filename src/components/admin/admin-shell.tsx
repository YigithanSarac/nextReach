import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Settings,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type AdminShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

const navItems = [
  { label: "Leads", href: "/admin", icon: Inbox, active: true },
  { label: "Conversations", href: "/admin", icon: MessageSquareText, active: false },
  { label: "Team", href: "/admin", icon: UsersRound, active: false },
  { label: "Settings", href: "/admin", icon: Settings, active: false },
];

export function AdminShell({
  children,
  title,
  description,
  actions,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17211b]">
      <AdminTopbar />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <AdminSidebar />
        <section className="min-w-0 flex-1">
          <div className="mb-5 flex flex-col gap-4 border-b border-[#dfe5db] pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#1f6f50]">
                <LayoutDashboard className="size-4" />
                Sales workspace
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#101813] sm:text-3xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736a]">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex w-full shrink-0 gap-2 overflow-x-auto md:w-auto md:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

function AdminTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe5db] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2" href="/">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#17211b] text-white">
            <MessageSquareText className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-4">NextReach</div>
            <div className="text-xs text-[#66736a]">Admin</div>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <div className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-[#dfe5db] bg-[#f7f8f5] px-3 text-sm text-[#66736a]">
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search leads, companies, or emails</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            aria-label="Notifications"
            className="border-[#dfe5db] bg-white text-[#17211b] hover:bg-[#eef2eb]"
            size="icon"
            variant="outline"
          >
            <Bell className="size-4" />
          </Button>
          <Button
            className="hidden border-[#dfe5db] bg-white text-[#17211b] hover:bg-[#eef2eb] sm:inline-flex"
            variant="outline"
          >
            Sales team
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function AdminSidebar() {
  return (
    <aside className="sticky top-21 hidden h-[calc(100vh-6rem)] w-56 shrink-0 lg:block">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className={
                item.active
                  ? "flex items-center gap-2 rounded-lg bg-[#17211b] px-3 py-2 text-sm font-medium text-white"
                  : "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#536158] hover:bg-[#eef2eb] hover:text-[#17211b]"
              }
              href={item.href}
              key={item.label}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function AdminContentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#dfe5db] bg-white">
      {children}
    </div>
  );
}
