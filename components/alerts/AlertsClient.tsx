"use client";

import { useEffect, useMemo, useState } from "react";
import { canCreateFlags } from "@/lib/client-permissions";
import CurrentUserPill from "@/components/auth/CurrentUserPill";
type AlertsClientProps = {
  initialFlags: any[];
};

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "red" | "amber" | "blue" | "yellow";
}) {
  const styles = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    yellow: "bg-yellow-50 text-yellow-800 ring-yellow-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function priorityTone(priority: string) {
  if (priority === "HIGH") return "red";
  if (priority === "MEDIUM") return "amber";
  return "slate";
}

function statusTone(status: string) {
  if (status === "OPEN") return "red";
  if (status === "RESOLVED") return "green";
  return "slate";
}

function getContextLabel(flag: any) {
  if (flag.watchlistEntryId) return "Watchlist";
  if (flag.position?.status === "CLOSED") return "Past Position";
  if (flag.position?.status === "ACTIVE") return "Active Position";
  return "Security";
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}


function AlertCard({
  flag,
  onResolve,
  canResolve,
}: {
  flag: any;
  onResolve: (flagId: string) => Promise<void>;
  canResolve: boolean;
}) {

  const isOpen = flag.status === "OPEN";

  const iconClass =
    flag.priority === "HIGH"
      ? "bg-rose-50 text-rose-600"
      : flag.priority === "MEDIUM"
      ? "bg-amber-50 text-amber-600"
      : "bg-slate-50 text-slate-500";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold ${iconClass}`}
        >
          {isOpen ? "!" : "✓"}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">
              {flag.security?.ticker || "N/A"}
            </h3>

            <Badge tone="blue">{flag.flagType}</Badge>

            <Badge tone={priorityTone(flag.priority) as any}>
              {flag.priority}
            </Badge>

            <Badge tone={statusTone(flag.status) as any}>
              {flag.status}
            </Badge>

            <Badge>{getContextLabel(flag)}</Badge>
          </div>

          <p className="mt-1 text-sm text-slate-600">
            {flag.description ||
              `${flag.flagType} alert for ${flag.security?.ticker || "N/A"}.`}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Created {formatDateTime(flag.createdAt)} by{" "}
            {flag.createdBy?.name || flag.createdBy?.email || "Unknown"}
          </p>
        </div>
      </div>

      {flag.status === "RESOLVED" ? (
          <button
            disabled
            className="ml-4 shrink-0 cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
          >
            Resolved
          </button>
        ) : canResolve ? (
          <button
            onClick={() => onResolve(flag.id)}
            className="ml-4 shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Resolve
          </button>
        ) : (
          <button
            disabled
            className="ml-4 shrink-0 cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
          >
            Read Only
          </button>
        )}
    </div>
  );
}

export default function AlertsClient({ initialFlags }: AlertsClientProps) {
  const [query, setQuery] = useState("");
  const [flags, setFlags] = useState<any[]>(initialFlags);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  useEffect(() => {
    async function loadCurrentUser() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) return;

      const data = await response.json();
      setCurrentUser(data.user);
    }

    loadCurrentUser();
  }, []);
  const filteredFlags = useMemo(() => {
  const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return flags;

    return flags.filter((flag) => {
      const searchable = [
        flag.security?.ticker,
        flag.security?.name,
        flag.flagType,
        flag.description,
        flag.priority,
        flag.status,
        getContextLabel(flag),
        flag.createdBy?.name,
        flag.createdBy?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [flags, query]);

  const openFlags = flags.filter((flag) => flag.status === "OPEN");
  const highPriority = flags.filter((flag) => flag.priority === "HIGH");
  const resolvedFlags = flags.filter((flag) => flag.status === "RESOLVED");
  const userCanResolveFlags = canCreateFlags(currentUser?.role);

  async function handleResolveFlag(flagId: string) {
  const response = await fetch(`/api/flags/${flagId}/resolve`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to resolve flag.");
  }

  const data = await response.json();
  const resolvedFlag = data.flag;

  setFlags((currentFlags) =>
    currentFlags.map((flag) =>
      flag.id === resolvedFlag.id ? resolvedFlag : flag
      )
    );
  }


  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full">
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
          <div className="mb-6 flex items-center gap-3 px-2 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
              ⌘
            </div>

            <div>
              <h1 className="font-semibold leading-tight">
                HCA Central Command
              </h1>
              <p className="text-xs text-slate-500">
                Portfolio operations hub
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            <a
                href="/"
                className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
                Home / Positions
            </a>

            <a
                href="/watchlist"
                className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
                Watchlist
            </a>

            <a
                href="/past-positions"
                className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
                Past Positions
            </a>

            <a
                href="/comments"
                className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
                Comments
            </a>

            <a
                href="/alerts"
                className="block rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm"
            >
                Alerts
            </a>

             <a
              href="/settings"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Settings
            </a>
            </nav>

          <div className="mt-auto rounded-3xl bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium">Compliance Mode</div>
            <p className="text-xs leading-5 text-slate-500">
              Alerts are backed by open flags and are retained for internal
              review.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">Alert Center</p>
              <p className="text-xs text-slate-500">Open flags and review workflow</p>
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="green">Live data mock</Badge>

              <CurrentUserPill />
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-auto p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Alert Center
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review price, risk, note-aging, catalyst, and thesis flags
                  across active positions and watchlists.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total Alerts
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {flags.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Flags in system
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Open
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-rose-600">
                    {openFlags.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Require review
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    High Priority
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600">
                    {highPriority.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Elevated attention
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Resolved
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">
                    {resolvedFlags.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Closed review items
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search ticker, alert type, priority, status, description..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="space-y-3">
                {filteredFlags.length ? (
                  filteredFlags.map((flag) => (
                    <AlertCard
                      key={flag.id}
                      flag={flag}
                      onResolve={handleResolveFlag}
                      canResolve={userCanResolveFlags}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                    No alerts matched your search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
