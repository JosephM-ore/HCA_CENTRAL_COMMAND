"use client";

import CurrentUserPill from "@/components/auth/CurrentUserPill";
import { useEffect, useState } from "react";
import { canViewAuditLogs } from "@/lib/client-permissions";
type SettingsClientProps = {
  auditLogCount: number;
  ingestionRuns: any[];
  users: any[];
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

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block rounded-2xl px-3 py-2.5 text-sm transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </a>
  );
}

function SettingsCard({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
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

export default function SettingsClient({
  auditLogCount,
  ingestionRuns,
  users,
}: SettingsClientProps) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isRefreshingMarketData, setIsRefreshingMarketData] = useState(false);
  const [marketDataRefreshResult, setMarketDataRefreshResult] = useState<any | null>(null);
  const [marketDataRefreshError, setMarketDataRefreshError] = useState("");
  const [isRefreshingFundamentals, setIsRefreshingFundamentals] = useState(false);
  const [fundamentalsRefreshResult, setFundamentalsRefreshResult] = useState<any | null>(null);
  const [fundamentalsRefreshError, setFundamentalsRefreshError] = useState("");

    useEffect(() => {
      async function loadCurrentUser() {
        const response = await fetch("/api/auth/me");

        if (!response.ok) return;

        const data = await response.json();
        setCurrentUser(data.user);
      }

      loadCurrentUser();
    }, []);


    async function handleRefreshMarketData() {
        setIsRefreshingMarketData(true);
        setMarketDataRefreshResult(null);
        setMarketDataRefreshError("");

        try {
          const response = await fetch("/api/admin/refresh-market-data", {
            method: "POST",
            credentials: "include",
          });

          const text = await response.text();

          let data: any = null;

          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(text || "Unexpected refresh response.");
          }
          if (!response.ok) {
            throw new Error(data.error || data.detail || "Market data refresh failed.");
          }

          setMarketDataRefreshResult(data);
        } catch (error) {
          setMarketDataRefreshError(
            error instanceof Error
              ? error.message
              : "Market data refresh failed."
          );
        } finally {
          setIsRefreshingMarketData(false);
        }
      }
      async function handleRefreshFundamentals() {
        setIsRefreshingFundamentals(true);
        setFundamentalsRefreshResult(null);
        setFundamentalsRefreshError("");

        try {
          const response = await fetch("/api/admin/refresh-fundamentals", {
            method: "POST",
            credentials: "include",
          });

          const text = await response.text();

          let data: any = null;

          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(text || "Unexpected refresh response.");
          }

          if (!response.ok) {
            throw new Error(data.error || data.detail || "Fundamentals refresh failed.");
          }

          setFundamentalsRefreshResult(data);
        } catch (error) {
          setFundamentalsRefreshError(
            error instanceof Error ? error.message : "Fundamentals refresh failed."
          );
        } finally {
          setIsRefreshingFundamentals(false);
        }
      }
    const userCanViewAuditLogs = canViewAuditLogs(currentUser?.role);
  
  
  const navItems = [
    { href: "/", label: "Home / Positions" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/past-positions", label: "Past Positions" },
    { href: "/comments", label: "Comments" },
    { href: "/alerts", label: "Alerts" },
    { href: "/settings", label: "Settings", active: true },
  ];

  const latestIngestionRun = ingestionRuns[0];

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
            {navItems.map((item) => (
                <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={item.active}
                />
            ))}
            </nav>

          <div className="mt-auto rounded-3xl bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium">Compliance Mode</div>
            <p className="text-xs leading-5 text-slate-500">
              Settings describe permissions, audit logging, data refresh, and
              future integration controls. Trading execution remains excluded.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">Settings</p>
              <p className="text-xs text-slate-500">Permissions, audit, data, and shortcuts</p>
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="green">FMP market data</Badge>

              <CurrentUserPill />

              
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-auto p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Settings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Prototype controls for permissions, audit logs, data refresh,
                  integrations, and trader workflow shortcuts.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Users
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {users.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Seeded local users
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Audit Logs
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {auditLogCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Internal workflow actions
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Ingestion Runs
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {ingestionRuns.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Integration refresh history
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Auth Mode
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600">
                    Local
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    SSO future placeholder
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SettingsCard
                  eyebrow="Access Control"
                  title="Permissions"
                  description="MVP roles include ADMIN, TRADER, ANALYST, PM, VIEWER, and COMPLIANCE. Role checks will later control commenting, flagging, watchlist edits, audit visibility, and admin-only settings."
                >
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {user.name || user.email}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                        <Badge tone={user.role === "ADMIN" ? "amber" : "blue"}>
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </SettingsCard>

                <SettingsCard
                    eyebrow="Compliance"
                    title="Audit Trail"
                    description="Audit logs capture internal workflow actions such as comment creation, watchlist edits, flag changes, ingestion runs, and future export events."
                    >
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {auditLogCount} audit records
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Admin and compliance users can review workflow history, entity changes, and JSON payloads.
                      </p>
                      
                  {userCanViewAuditLogs ? (
                    <a
                      href="/audit-logs"
                      className="mt-3 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      View Audit Logs
                    </a>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                      Audit Logs are Admin / Compliance only
                    </div>
                  )}

                    </div>
                </SettingsCard>

                <SettingsCard
                  eyebrow="Data Operations"
                  title="Data Refresh"
                  description="Market data is refreshed from Financial Modeling Prep and stored in the local market data cache. Symbols unavailable under the current data plan continue using cached fallback values."
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Market Data
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        FMP provider
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Latest Ingestion
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {latestIngestionRun?.status || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">
                          FMP Market Data Refresh
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Refresh cached market data from Financial Modeling Prep. Some symbols
                          may continue using cached fallback values if unavailable under the
                          current data plan.
                        </p>
                      </div>

                      {userCanViewAuditLogs ? (
                        <button
                          onClick={handleRefreshMarketData}
                          disabled={isRefreshingMarketData}
                          className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRefreshingMarketData ? "Refreshing..." : "Refresh FMP Market Data"}
                        </button>
                      ) : (
                        <div className="shrink-0 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                          Admin / Compliance only
                        </div>
                      )}
                    </div>

                    {marketDataRefreshResult ? (
                      <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                        FMP refresh complete. Updated:{" "}
                        <span className="font-semibold">
                          {marketDataRefreshResult.updatedCount}
                        </span>
                        . Failed:{" "}
                        <span className="font-semibold">
                          {marketDataRefreshResult.failedCount}
                        </span>
                        .
                      </div>
                    ) : null}

                    {marketDataRefreshError ? (
                      <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                        {marketDataRefreshError}
                      </div>
                    ) : null}

                    {marketDataRefreshResult?.results?.length ? (
                      <div className="mt-4 max-h-56 overflow-auto rounded-2xl border border-slate-200">
                        {marketDataRefreshResult.results.map((result: any) => (
                          <div
                            key={result.ticker}
                            className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs last:border-b-0"
                          >
                            <span className="font-semibold text-slate-700">
                              {result.ticker}
                            </span>

                            <span
                              className={
                                result.status === "UPDATED"
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }
                            >
                              {result.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-950">SEC Fundamentals</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Refresh accounting and filing-derived metrics from SEC EDGAR Company Facts.
                          </p>
                        </div>

                        {userCanViewAuditLogs ? (
                          <button
                            onClick={handleRefreshFundamentals}
                            disabled={isRefreshingFundamentals}
                            className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRefreshingFundamentals ? "Refreshing..." : "Refresh SEC Fundamentals"}
                          </button>
                        ) : (
                          <div className="shrink-0 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                            Admin / Compliance only
                          </div>
                        )}
                      </div>

                      {fundamentalsRefreshResult ? (
                        <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                          SEC refresh complete. Updated: <span className="font-semibold">{fundamentalsRefreshResult.updatedCount}</span>. Failed: <span className="font-semibold">{fundamentalsRefreshResult.failedCount}</span>.
                        </div>
                      ) : null}

                      {fundamentalsRefreshError ? (
                        <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                          {fundamentalsRefreshError}
                        </div>
                      ) : null}

                      {fundamentalsRefreshResult?.results?.length ? (
                        <div className="mt-4 max-h-56 overflow-auto rounded-2xl border border-slate-200">
                          {fundamentalsRefreshResult.results.map((result: any) => (
                            <div key={result.ticker} className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs last:border-b-0">
                              <span className="font-semibold text-slate-700">{result.ticker}</span>
                              <span className={result.status === "UPDATED" ? "text-emerald-600" : "text-amber-600"}>{result.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {latestIngestionRun ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 p-3 text-xs text-slate-500">
                      <p>
                        Source:{" "}
                        <span className="font-semibold text-slate-700">
                          {latestIngestionRun.source}
                        </span>
                      </p>
                      <p className="mt-1">
                        Started: {formatDateTime(latestIngestionRun.startedAt)}
                      </p>
                      <p className="mt-1">
                        Message: {latestIngestionRun.message || "—"}
                      </p>
                    </div>
                  ) : null}
                </SettingsCard>

                <SettingsCard
                  eyebrow="Workflow"
                  title="Trader Shortcuts"
                  description="Future keyboard shortcuts can support quick search, new comment, flag creation, ticker panel close, and command-palette style navigation."
                >
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="font-semibold">/</span> Search
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="font-semibold">N</span> New comment
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="font-semibold">F</span> Flag ticker
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="font-semibold">Esc</span> Close panel
                    </div>
                  </div>
                </SettingsCard>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Future Integration Stubs
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">
                      Wells Fargo, FMP Expansion, and Bank SSO
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">                
                      The MVP keeps these integrations as placeholders. Wells Fargo
                      will later ingest official reports, FMP can be expanded with
                      additional market-data endpoints or a paid plan, and bank SSO
                      will replace local username/password authentication.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone="amber">Wells Fargo Stub</Badge>
                    <Badge tone="blue">FMP Expansion</Badge>
                    <Badge tone="slate">SSO Future</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}