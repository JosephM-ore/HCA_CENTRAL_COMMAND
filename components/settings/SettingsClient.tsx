"use client";
import LocalDateTime from "@/components/common/LocalDateTime";
import Badge from "@/components/common/Badge";
import CurrentUserPill from "@/components/auth/CurrentUserPill";
import { useEffect, useState } from "react";
import { canViewAuditLogs } from "@/lib/client-permissions";
import HcaLogo from "@/components/common/HcaLogo";
type SettingsClientProps = {
  auditLogCount: number;
  ingestionRuns: any[];
  users: any[];
  initialRegistrationApprovals: any[];
  canManageUserAccess: boolean;
};

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

function DataOperationStep({
  step,
  title,
  description,
  details,
  children,
}: {
  step: string;
  title: string;
  description: string;
  details: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {step}
            </span>

            <h3 className="text-sm font-semibold text-slate-950">
              {title}
            </h3>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {details}
          </p>
        </div>

        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}
function WellsUploadResultPanel({
  title,
  result,
}: {
  title: string;
  result: any;
}) {
  if (!result) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
        <p className="font-semibold">
          {title}: {result.reportType || "N/A"}
        </p>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span>Rows processed</span>
          <span className="font-semibold">
            {result.rowsProcessed ?? "N/A"}
          </span>

          <span>Rows failed</span>
          <span className="font-semibold">{result.rowsFailed ?? "N/A"}</span>

          <span>Securities created</span>
          <span className="font-semibold">
            {result.securitiesCreated ?? "N/A"}
          </span>

          <span>Securities updated</span>
          <span className="font-semibold">
            {result.securitiesUpdated ?? "N/A"}
          </span>

          <span>Positions created</span>
          <span className="font-semibold">
            {result.positionsCreated ?? "N/A"}
          </span>

          <span>Positions updated</span>
          <span className="font-semibold">
            {result.positionsUpdated ?? "N/A"}
          </span>

          <span>Positions closed</span>
          <span className="font-semibold">
            {result.positionsClosed ?? "N/A"}
          </span>

          <span>Trades created</span>
          <span className="font-semibold">
            {result.tradesCreated ?? "N/A"}
          </span>

          <span>Trades updated</span>
          <span className="font-semibold">
            {result.tradesUpdated ?? "N/A"}
          </span>
        </div>
      </div>

      {result.failures?.length ? (
        <div className="max-h-56 overflow-auto rounded-2xl border border-amber-200 bg-amber-50">
          {result.failures.map((failure: string, index: number) => (
            <div
              key={`${title}-${failure}-${index}`}
              className="border-b border-amber-100 px-4 py-2 text-xs text-amber-800 last:border-b-0"
            >
              {failure}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
export default function SettingsClient({
  auditLogCount,
  ingestionRuns,
  users,
  initialRegistrationApprovals,
  canManageUserAccess,
}: SettingsClientProps) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const [registrationApprovals, setRegistrationApprovals] =
    useState<any[]>(initialRegistrationApprovals);

  const [isApproveUserOpen, setIsApproveUserOpen] =
    useState(false);

  const [approvalEmail, setApprovalEmail] =
    useState("");

  const [approvalRole, setApprovalRole] =
    useState("VIEWER");

  const [approvalError, setApprovalError] =
    useState("");

  const [isApprovingUser, setIsApprovingUser] =
    useState(false);

  const [revokingApprovalId, setRevokingApprovalId] =
    useState<string | null>(null);

  const [isUploadingWells, setIsUploadingWells] = useState(false);
  const [wellsTaxLotsFile, setWellsTaxLotsFile] = useState<File | null>(null);
  const [wellsTransactionsFile, setWellsTransactionsFile] = useState<File | null>(
    null
  );
  const [wellsTaxLotsUploadResult, setWellsTaxLotsUploadResult] = useState<
    any | null
  >(null);
  const [wellsTransactionsUploadResult, setWellsTransactionsUploadResult] =
    useState<any | null>(null);
  const [wellsUploadError, setWellsUploadError] = useState("");
  const [wellsFileInputResetKey, setWellsFileInputResetKey] = useState(0);

  const [isRefreshingMarketData, setIsRefreshingMarketData] = useState(false);
  const [marketDataRefreshResult, setMarketDataRefreshResult] =
    useState<any | null>(null);
  const [marketDataRefreshError, setMarketDataRefreshError] = useState("");

  const [isRefreshingSecEnrichment, setIsRefreshingSecEnrichment] =
    useState(false);
  const [secEnrichmentRefreshResult, setSecEnrichmentRefreshResult] =
    useState<any | null>(null);
  const [secEnrichmentRefreshError, setSecEnrichmentRefreshError] = useState("");
  
 
  
    useEffect(() => {
      async function loadCurrentUser() {
        const response = await fetch("/api/auth/me");

        if (!response.ok) return;

        const data = await response.json();
        setCurrentUser(data.user);
      }

      loadCurrentUser();
    }, []);

    async function handleApproveUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setApprovalError("");
    setIsApprovingUser(true);

    try {
      const response = await fetch(
        "/api/admin/registration-approvals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: approvalEmail,
            role: approvalRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setApprovalError(
          data.error || "Failed to approve registration access."
        );
        return;
      }

      setRegistrationApprovals((currentApprovals) => [
        data.approval,
        ...currentApprovals.filter(
          (approval) => approval.id !== data.approval.id
        ),
      ]);

      setApprovalEmail("");
      setApprovalRole("VIEWER");
      setApprovalError("");
      setIsApproveUserOpen(false);
    } catch {
      setApprovalError(
        "Failed to approve registration access. Please try again."
      );
    } finally {
      setIsApprovingUser(false);
    }
  }

  async function handleRevokeApproval(approval: any) {
    const confirmed = window.confirm(
      `Revoke registration access for ${approval.email}?`
    );

    if (!confirmed) {
      return;
    }

    setRevokingApprovalId(approval.id);

    try {
      const response = await fetch(
        `/api/admin/registration-approvals/${approval.id}/revoke`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        window.alert(
          data.error || "Failed to revoke registration access."
        );
        return;
      }

      setRegistrationApprovals((currentApprovals) =>
        currentApprovals.map((currentApproval) =>
          currentApproval.id === data.approval.id
            ? data.approval
            : currentApproval
        )
      );
    } catch {
      window.alert(
        "Failed to revoke registration access. Please try again."
      );
    } finally {
      setRevokingApprovalId(null);
    }
  }

  function closeApproveUserModal() {
    if (isApprovingUser) {
      return;
    }

    setIsApproveUserOpen(false);
    setApprovalEmail("");
    setApprovalRole("VIEWER");
    setApprovalError("");
  }
    

async function uploadSingleWellsFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/ingestion/wells/manual-upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const text = await response.text();

  let data: any = null;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || "Unexpected Wells upload response.");
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || "Wells upload failed.");
  }

  return data;
}

async function handleWellsUpload() {
  if (!wellsTaxLotsFile || !wellsTransactionsFile) {
    setWellsUploadError(
      "Please select both Wells files before uploading: TaxLotDailyTD and ActTDDaily."
    );
    return;
  }

  setIsUploadingWells(true);
  setWellsTaxLotsUploadResult(null);
  setWellsTransactionsUploadResult(null);
  setWellsUploadError("");

  try {
    const taxLotsResult = await uploadSingleWellsFile(wellsTaxLotsFile);
    setWellsTaxLotsUploadResult(taxLotsResult);

    const transactionsResult = await uploadSingleWellsFile(
      wellsTransactionsFile
    );
    setWellsTransactionsUploadResult(transactionsResult);

    setWellsTaxLotsFile(null);
    setWellsTransactionsFile(null);
    setWellsFileInputResetKey((currentKey) => currentKey + 1);
  } catch (error) {
    setWellsUploadError(
      error instanceof Error ? error.message : "Wells upload failed."
    );
  } finally {
    setIsUploadingWells(false);
  }
}

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
      async function handleRefreshSecEnrichment() {
  setIsRefreshingSecEnrichment(true);
  setSecEnrichmentRefreshResult(null);
  setSecEnrichmentRefreshError("");

  try {
    const cikResponse = await fetch("/api/admin/refresh-ciks", {
      method: "POST",
      credentials: "include",
    });

    const cikText = await cikResponse.text();

    let cikData: any = null;

    try {
      cikData = JSON.parse(cikText);
    } catch {
      throw new Error(cikText || "Unexpected SEC CIK refresh response.");
    }

    if (!cikResponse.ok) {
      throw new Error(
        cikData.error || cikData.detail || "SEC CIK refresh failed."
      );
    }

    const fundamentalsResponse = await fetch("/api/admin/refresh-fundamentals", {
      method: "POST",
      credentials: "include",
    });

    const fundamentalsText = await fundamentalsResponse.text();

    let fundamentalsData: any = null;

    try {
      fundamentalsData = JSON.parse(fundamentalsText);
    } catch {
      throw new Error(
        fundamentalsText || "Unexpected SEC fundamentals refresh response."
      );
    }

    if (!fundamentalsResponse.ok) {
      throw new Error(
        fundamentalsData.error ||
          fundamentalsData.detail ||
          "SEC fundamentals refresh failed."
      );
    }

    setSecEnrichmentRefreshResult({
      cik: cikData,
      fundamentals: fundamentalsData,
    });
  } catch (error) {
    setSecEnrichmentRefreshError(
      error instanceof Error ? error.message : "SEC enrichment refresh failed."
    );
  } finally {
    setIsRefreshingSecEnrichment(false);
  }
}
    const userCanViewAuditLogs = canViewAuditLogs(currentUser?.role);
    
    const pendingRegistrationApprovals =
      registrationApprovals.filter(
        (approval) => approval.status === "PENDING"
    );
  
  const navItems = [
    { href: "/", label: "Home / Positions" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/past-positions", label: "Past Positions" },
    { href: "/comments", label: "Comments" },
    { href: "/alerts", label: "Alerts" },
    { href: "/trade-calculator", label: "Trade Calculator" },
    { href: "/settings", label: "Settings", active: true },
  ];

  const latestIngestionRun = ingestionRuns[0];

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full">
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
          <div className="mb-6 flex items-center gap-3 px-2 py-2">
            <HcaLogo />

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
                  title="User Access"
                  description="Registered users are read-only. Administrators can approve email addresses and assign roles for self-registration."
                >
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Registered users
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Existing accounts and assigned roles
                          </p>
                        </div>

                        {canManageUserAccess ? (
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalError("");
                              setIsApproveUserOpen(true);
                            }}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                          >
                            Approve New User
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-2">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800">
                                {user.name || user.email}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {user.email}
                              </p>
                            </div>

                            <Badge
                              tone={
                                user.role === "ADMIN"
                                  ? "amber"
                                  : "blue"
                              }
                            >
                              {user.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {canManageUserAccess ? (
                      <div className="border-t border-slate-200 pt-5">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Pending registrations
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Approved email addresses that have not registered
                          </p>
                        </div>

                        <div className="mt-3 space-y-2">
                          {pendingRegistrationApprovals.length ? (
                            pendingRegistrationApprovals.map(
                              (approval) => (
                                <div
                                  key={approval.id}
                                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                      {approval.email}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Approved by{" "}
                                      {approval.approvedBy?.name ||
                                        approval.approvedBy?.email ||
                                        "Administrator"}
                                    </p>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2">
                                    <Badge tone="blue">
                                      {approval.role}
                                    </Badge>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRevokeApproval(approval)
                                      }
                                      disabled={
                                        revokingApprovalId === approval.id
                                      }
                                      className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {revokingApprovalId === approval.id
                                        ? "Revoking..."
                                        : "Revoke"}
                                    </button>
                                  </div>
                                </div>
                              )
                            )
                          ) : (
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                              No pending registration approvals.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-slate-200 pt-4">
                        <p className="text-xs leading-5 text-slate-500">
                          Registered users are shown for reference. Only
                          administrators can approve new registrations.
                        </p>
                      </div>
                    )}
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

                
                <div className="lg:col-span-2">
                  <SettingsCard
                    eyebrow="Data Operations"
                    title="Data Refresh"
                    description="Run these operations in order. Wells uploads establish positions, tax lots, trades, and closed-position detection. SEC enrichment resolves CIKs and refreshes fundamentals. Current price refresh updates live market data only."
                  >

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Data Source Order
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        Wells → SEC → Finnhub
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

                  <div className="mt-4 space-y-4">
                    <DataOperationStep
                      step="1"
                      title="Wells CSV Upload"
                      description="Upload Wells files first. TaxLotDailyTD refreshes positions, tax lots, and closed-position detection. ActTDDaily refreshes trade history and reconciliation."
                      details="Updates: positions, past-position detection, tax lots, trades, and trade reconciliation. Does not update current prices or SEC fundamentals."
                    >
                      {userCanViewAuditLogs ? (
                        <div className="w-96 max-w-full space-y-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              TaxLotDailyTD / Positions
                            </label>
                            <input
                              key={`tax-lots-${wellsFileInputResetKey}`}
                              type="file"
                              accept=".csv,text/csv"
                              disabled={isUploadingWells}
                              onChange={(event) =>
                                setWellsTaxLotsFile(event.target.files?.[0] || null)
                              }
                              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800"
                            />
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {wellsTaxLotsFile?.name || "No tax lot file selected"}
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              ActTDDaily / Transactions
                            </label>
                            <input
                              key={`transactions-${wellsFileInputResetKey}`}
                              type="file"
                              accept=".csv,text/csv"
                              disabled={isUploadingWells}
                              onChange={(event) =>
                                setWellsTransactionsFile(event.target.files?.[0] || null)
                              }
                              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800"
                            />
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {wellsTransactionsFile?.name || "No transaction file selected"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleWellsUpload}
                            disabled={isUploadingWells || !wellsTaxLotsFile || !wellsTransactionsFile}
                            className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUploadingWells ? "Uploading Wells files..." : "Upload both Wells files"}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                          Admin / Compliance only
                        </div>
                      )}
                    </DataOperationStep>

                    {wellsTaxLotsUploadResult ? (
                      <WellsUploadResultPanel
                        title="Tax lots / positions upload complete"
                        result={wellsTaxLotsUploadResult}
                      />
                    ) : null}

                    {wellsTransactionsUploadResult ? (
                      <WellsUploadResultPanel
                        title="Transaction activity upload complete"
                        result={wellsTransactionsUploadResult}
                      />
                    ) : null}

                    {wellsUploadError ? (
                      <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                        {wellsUploadError}
                      </div>
                    ) : null}
                    {wellsUploadError ? (
                      <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                        {wellsUploadError}
                      </div>
                    ) : null}



                    <DataOperationStep
                      step="2"
                      title="SEC Enrichment Refresh"
                      description="Runs SEC CIK refresh first, then SEC fundamentals refresh. Use this after new tickers appear from Wells or Watchlist, or when fundamentals look stale."
                      details="Updates: Security.cik and SEC-derived fundamental fields in MarketDataCache. Does not update prices, positions, tax lots, or trade history."
                    >
                      {userCanViewAuditLogs ? (
                        <button
                          onClick={handleRefreshSecEnrichment}
                          disabled={isRefreshingSecEnrichment}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRefreshingSecEnrichment
                            ? "Refreshing..."
                            : "Refresh SEC Enrichment"}
                        </button>
                      ) : (
                        <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                          Admin / Compliance only
                        </div>
                      )}
                    </DataOperationStep>

                    {secEnrichmentRefreshResult ? (
                      <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                        <p className="font-semibold">SEC enrichment refresh complete.</p>

                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <span>CIKs updated</span>
                          <span className="font-semibold">
                            {secEnrichmentRefreshResult.cik?.updatedCount ?? "N/A"}
                          </span>

                          <span>CIKs failed</span>
                          <span className="font-semibold">
                            {secEnrichmentRefreshResult.cik?.failedCount ?? "N/A"}
                          </span>

                          <span>Fundamentals updated</span>
                          <span className="font-semibold">
                            {secEnrichmentRefreshResult.fundamentals?.updatedCount ?? "N/A"}
                          </span>

                          <span>Fundamentals failed</span>
                          <span className="font-semibold">
                            {secEnrichmentRefreshResult.fundamentals?.failedCount ?? "N/A"}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {secEnrichmentRefreshError ? (
                      <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                        {secEnrichmentRefreshError}
                      </div>
                    ) : null}

                    <DataOperationStep
                      step="3"
                      title="Current Price Refresh"
                      description="Refreshes current prices and day-change data from Finnhub for active Wells positions and active watchlist securities."
                      details="Updates: current price, day change, day %, volume, and market-data fields. Does not update Wells economics, tax lots, trades, or SEC fundamentals."
                    >
                      {userCanViewAuditLogs ? (
                        <button
                          onClick={handleRefreshMarketData}
                          disabled={isRefreshingMarketData}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRefreshingMarketData
                            ? "Refreshing..."
                            : "Refresh Current Prices"}
                        </button>
                      ) : (
                        <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                          Admin / Compliance only
                        </div>
                      )}
                    </DataOperationStep>

                    {marketDataRefreshResult ? (
                      <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                        Current price refresh complete. Updated:{" "}
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
                      <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                        {marketDataRefreshError}
                      </div>
                    ) : null}

                    {marketDataRefreshResult?.results?.length ? (
                      <div className="max-h-56 overflow-auto rounded-2xl border border-slate-200">
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

                    {latestIngestionRun ? (
                      <div className="rounded-2xl border border-slate-200 p-3 text-xs text-slate-500">
                        <p>
                          Latest source:{" "}
                          <span className="font-semibold text-slate-700">
                            {latestIngestionRun.source}
                          </span>
                        </p>
                        <p className="mt-1">
                          Started:{" "}
                          <LocalDateTime value={latestIngestionRun.startedAt} />
                        </p>
                        <p className="mt-1">
                          Message: {latestIngestionRun.message || "—"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </SettingsCard>
                </div>

                
              </div>

              
            </div>
          </div>
                </section>
      </div>

      {isApproveUserOpen && canManageUserAccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Approve New User
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Approve an email address and assign the role the user
                  will receive during registration.
                </p>
              </div>

              <button
                type="button"
                onClick={closeApproveUserModal}
                disabled={isApprovingUser}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleApproveUser}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  value={approvalEmail}
                  onChange={(event) =>
                    setApprovalEmail(event.target.value)
                  }
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isApprovingUser}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="approved.user@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Role
                </label>

                <select
                  value={approvalRole}
                  onChange={(event) =>
                    setApprovalRole(event.target.value)
                  }
                  disabled={isApprovingUser}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="TRADER">TRADER</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="PM">PM</option>
                  <option value="VIEWER">VIEWER</option>
                  <option value="COMPLIANCE">COMPLIANCE</option>
                </select>
              </div>

              {approvalError ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {approvalError}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeApproveUserModal}
                  disabled={isApprovingUser}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isApprovingUser}
                  className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApprovingUser
                    ? "Approving..."
                    : "Approve User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}