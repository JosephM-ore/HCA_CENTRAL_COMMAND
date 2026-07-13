"use client";
import LocalDateTime from "@/components/common/LocalDateTime";
import Badge from "@/components/common/Badge";
import { useMemo, useState } from "react";
import CurrentUserPill from "@/components/auth/CurrentUserPill";

type AuditLogsClientProps = {
  initialLogs: any[];
};



function actionTone(action: string) {
  if (action.includes("CREATED")) return "green";
  if (action.includes("RESOLVED")) return "amber";
  if (action.includes("LOGIN")) return "blue";
  if (action.includes("FAILED")) return "red";
  return "slate";
}

function prettyJson(value: string | null | undefined) {
  if (!value) return "—";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function AuditLogCard({ log }: { log: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={actionTone(log.action) as any}>{log.action}</Badge>
          <Badge tone="blue">{log.entityType}</Badge>
          <Badge>{log.actor?.role || "UNKNOWN"}</Badge>
        </div>

        <span className="text-xs text-slate-400">
          <LocalDateTime value={log.createdAt} />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Actor
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {log.actor?.name || log.actor?.email || "Unknown"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {log.actor?.email || "—"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Entity ID
          </p>
          <p className="mt-1 truncate font-mono text-xs text-slate-700">
            {log.entityId}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Request Context
          </p>
          <p className="mt-1 text-xs text-slate-500">
            IP: {log.ipAddress || "N/A"}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            UA: {log.userAgent || "N/A"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Previous Value
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
            {prettyJson(log.previousValueJson)}
          </pre>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            New Value
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
            {prettyJson(log.newValueJson)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsClient({ initialLogs }: AuditLogsClientProps) {
  const [query, setQuery] = useState("");

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return initialLogs;

    return initialLogs.filter((log) => {
      const searchable = [
        log.action,
        log.entityType,
        log.entityId,
        log.actor?.name,
        log.actor?.email,
        log.actor?.role,
        log.previousValueJson,
        log.newValueJson,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [initialLogs, query]);

  const createdCount = initialLogs.filter((log) =>
    log.action.includes("CREATED")
  ).length;

  const resolvedCount = initialLogs.filter((log) =>
    log.action.includes("RESOLVED")
  ).length;

  const loginCount = initialLogs.filter((log) =>
    log.action.includes("LOGIN")
  ).length;

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
            className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
        >
            Alerts
        </a>

        <a
            href="/settings"
            className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
        >
            Settings
        </a>

        <a
            href="/audit-logs"
            className="block"
        >
            Audit-logs
        </a>

        </nav>

          <div className="mt-auto rounded-3xl bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium">Compliance Mode</div>
            <p className="text-xs leading-5 text-slate-500">
              Audit logs preserve internal workflow events for compliance and
              operational review.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">Audit Logs</p>
              <p className="text-xs text-slate-500">
                Internal workflow and compliance history
              </p>
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
                  Audit Logs
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review internal actions including comments, flags, watchlist
                  changes, ingestion events, and user logins.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total Logs
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {initialLogs.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Most recent 500 records
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Created Actions
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">
                    {createdCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Comments, flags, entries
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Resolutions
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600">
                    {resolvedCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Resolved workflow items
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Logins
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-blue-600">
                    {loginCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Local auth activity
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search action, actor, entity type, entity ID, JSON payload..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-3">
                {filteredLogs.length ? (
                  filteredLogs.map((log) => (
                    <AuditLogCard key={log.id} log={log} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                    No audit logs matched your search.
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