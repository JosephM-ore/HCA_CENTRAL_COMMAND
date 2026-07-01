"use client";

import { useEffect, useMemo, useState } from "react";
import CurrentUserPill from "@/components/auth/CurrentUserPill";

import {
  canCreateComments,
  canCreateFlags,
} from "@/lib/client-permissions";


type DashboardClientProps = {
  positions: any[];
};




function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function pnlClass(value: number | null | undefined) {
  if (value == null) return "text-slate-500";
  return value >= 0 ? "text-emerald-600" : "text-rose-600";
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "red" | "amber" | "blue";
}) {
  const styles = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionBar({
  title,
  tone,
}: {
  title: string;
  tone: "green" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-700 text-white"
      : "bg-red-600 text-white";

  return (
    <div
      className={`rounded-t-2xl px-4 py-2 text-center text-xs font-bold uppercase tracking-widest ${toneClass}`}
    >
      {title}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function PositionGrid({
  title,
  tone,
  positions,
  selectedId,
  onSelect,
  onMarketData,
  onComment,
  canComment,
}: {
  title: string;
  tone: "green" | "red";
  positions: any[];
  selectedId?: string;
  onSelect: (position: any) => void;
  onMarketData: (position: any) => void;
  onComment: (position: any) => void;
  canComment: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <SectionBar title={title} tone={tone} />

      <div className="overflow-x-auto">
        <div className="grid min-w-[1180px] grid-cols-12 border-b bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <div>Ticker</div>
          <div className="col-span-2">Company Name</div>
          <div>Current Price</div>
          <div>% Change In Trading Day</div>
          <div>Mrkt Value Of Position</div>
          <div>% Of Portfolio</div>
          <div>Total # Of Shares</div>
          <div>WAP</div>
          <div>Total % Change</div>
          <div>Market Data</div>
          <div>Comment Section</div>
        </div>

        {positions.map((position) => {
          const marketData = position.security.marketData?.[0];
          const latestComment = position.comments?.[0];
          const openFlag = position.flags?.[0];

          return (
            <div
              key={position.id}
              className={`grid min-w-[1180px] grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-xs transition hover:bg-slate-50 ${
                selectedId === position.id ? "bg-slate-100" : "bg-white"
              }`}
            >
              <button
                onClick={() => onSelect(position)}
                className="flex items-center gap-1 text-left font-semibold text-slate-950 hover:underline"
              >
                {position.security.ticker}
                {openFlag ? (
                  <span className="text-amber-500" title={openFlag.flagType}>
                    ⚑
                  </span>
                ) : null}
              </button>

              <div className="col-span-2 truncate text-slate-600">
                {position.security.name}
              </div>

              <div className="font-medium">
                {marketData?.currentPrice != null
                  ? `$${marketData.currentPrice.toFixed(2)}`
                  : "—"}
              </div>

              <div className={`font-semibold ${pnlClass(position.dayPctChange)}`}>
                {position.dayPctChange != null
                  ? `${position.dayPctChange >= 0 ? "+" : ""}${
                      position.dayPctChange
                    }%`
                  : "—"}
              </div>

              <div>{formatMoney(position.marketValue)}</div>

              <div>
                {position.portfolioPct != null
                  ? `${position.portfolioPct}%`
                  : "—"}
              </div>

              <div>{formatNumber(position.shares)}</div>

              <div>{position.wap != null ? `$${position.wap.toFixed(2)}` : "—"}</div>

              <div className={`font-semibold ${pnlClass(position.totalPctChange)}`}>
                {position.totalPctChange != null
                  ? `${position.totalPctChange >= 0 ? "+" : ""}${
                      position.totalPctChange
                    }%`
                  : "—"}
              </div>

              <div>
               <button
                onClick={() => onMarketData(position)}
                className="rounded-xl bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200"
                >
                Market Data
                </button>
              </div>

              <div>
                {canComment ? (
                  <button
                    onClick={() => onComment(position)}
                    className="rounded-xl bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {latestComment ? "Comment" : "Add Comment"}
                  </button>
                ) : (
                  <span className="rounded-xl bg-slate-100 px-2 py-1 font-medium text-slate-400">
                    Read Only
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TickerDetailPanel({
  position,
  onClose,
  onComment,
  onMarketData,
  onFlag,
  canComment,
  canFlag,
}: {
  position: any | null;
  onClose: () => void;
  onComment: (position: any) => void;
  onMarketData: (position: any) => void;
  onFlag: (position: any) => void;
  canComment: boolean;
  canFlag: boolean;
}) {
  if (!position) return null;

  const security = position.security;
  const marketData = security.marketData?.[0];
  const openFlag = position.flags?.[0];
  const latestComment = position.comments?.[0];

  return (
    <aside className="flex h-full w-[460px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-950">
                {security.ticker}
              </h2>

              <Badge tone={position.side === "SHORT" ? "red" : "green"}>
                {position.side}
              </Badge>

              {openFlag ? <Badge tone="amber">{openFlag.flagType}</Badge> : null}
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {security.name} • Clicked ticker detail
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Current Price</p>
            <p className="mt-1 font-semibold text-slate-950">
              {marketData?.currentPrice != null
                ? `$${marketData.currentPrice.toFixed(2)}`
                : "—"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">WAP / Point</p>
            <p className="mt-1 font-semibold text-slate-950">
              {position.wap != null ? `$${position.wap.toFixed(2)}` : "—"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Shares</p>
            <p className="mt-1 font-semibold text-slate-950">
              {formatNumber(position.shares)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total % Change</p>
            <p className={`mt-1 font-semibold ${pnlClass(position.totalPctChange)}`}>
              {position.totalPctChange != null
                ? `${position.totalPctChange >= 0 ? "+" : ""}${
                    position.totalPctChange
                  }%`
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canComment ? (
            <button
              onClick={() => onComment(position)}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Comment
            </button>
          ) : (
            <button
              disabled
              className="cursor-not-allowed rounded-2xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
            >
              Read Only
            </button>
          )}
          {canFlag ? (
            <button
              onClick={() => onFlag(position)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Flag
            </button>
          ) : (
            <button
              disabled
              className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
            >
              Flag
            </button>
          )}     
          <button
            onClick={() => onMarketData(position)}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Market Data
          </button>
          <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-950">
            Trade History From Ticker Click
          </h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 text-xs">
          <div className="grid grid-cols-6 gap-2 bg-slate-50 px-3 py-3 font-semibold uppercase tracking-wide text-slate-500">
            <span>Ticker</span>
            <span>Date Traded</span>
            <span>Shares Traded</span>
            <span>Avg Price</span>
            <span>PT History</span>
            <span>Comment</span>
          </div>

          {position.trades?.length ? (
            position.trades.map((trade: any) => (
              <div
                key={trade.id}
                className="grid grid-cols-6 gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0"
              >
                <span className="font-semibold">{security.ticker}</span>
                <span>
                  {formatDate(trade.dateTraded)}
                </span>
                <span>{formatNumber(trade.shares)}</span>
                <span>${trade.avgPrice.toFixed(2)}</span>
                <span>{trade.ptHistory || "—"}</span>
                <span className="truncate text-slate-500">
                  {trade.comment || "—"}
                </span>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-slate-500">No trade history yet.</div>
          )}
        </div>

        <section className="mt-5">
          <h3 className="mb-3 font-semibold text-slate-950">Comment Section</h3>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {latestComment?.content || "No comment added yet."}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-3 font-semibold text-slate-950">Comment Timeline</h3>

          <div className="space-y-3">
            {position.comments?.length ? (
              position.comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge tone="blue">{comment.tag}</Badge>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(comment.createdAt)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-700">
                    {comment.content}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    by {comment.author?.name || comment.author?.email || "Unknown"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                No comments yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
function MarketDataModal({
  position,
  onClose,
}: {
  position: any | null;
  onClose: () => void;
}) {
  if (!position) return null;

  const security = position.security;
  const marketData = security.marketData?.[0];

  const rows = [
    ["VWAP", marketData?.vwap != null ? `$${marketData.vwap.toFixed(2)}` : "N/A"],
    [
      "52 Week High",
      marketData?.high52w != null ? `$${marketData.high52w.toFixed(2)}` : "N/A",
    ],
    [
      "52 Week Low",
      marketData?.low52w != null ? `$${marketData.low52w.toFixed(2)}` : "N/A",
    ],
    ["Beta", marketData?.beta != null ? marketData.beta.toFixed(2) : "N/A"],
    [
      "Avg Volume",
      marketData?.avgVolume != null
        ? marketData.avgVolume.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })
        : "N/A",
    ],
    [
      "Short Float",
      marketData?.shortFloat != null ? `${marketData.shortFloat}%` : "N/A",
    ],
    [
      "Market Cap",
      marketData?.marketCap != null ? formatMoney(marketData.marketCap) : "N/A",
    ],
    ["P/LTM EPS", marketData?.peLtm != null ? `${marketData.peLtm.toFixed(1)}x` : "N/A"],
    [
      "Price/Tang Book",
      marketData?.priceToTangBook != null
        ? `${marketData.priceToTangBook.toFixed(1)}x`
        : "N/A",
    ],
    ["P/NTM EPS", marketData?.peNtm != null ? `${marketData.peNtm.toFixed(1)}x` : "N/A"],
    [
      "Price/Book",
      marketData?.priceToBook != null
        ? `${marketData.priceToBook.toFixed(1)}x`
        : "N/A",
    ],
    [
      "Total Debt/EBITDA",
      marketData?.debtToEbitda != null
        ? `${marketData.debtToEbitda.toFixed(1)}x`
        : "N/A",
    ],
    ["EPS", marketData?.eps != null ? `$${marketData.eps.toFixed(2)}` : "N/A"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Market Data
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {security.ticker} • {security.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className={`grid grid-cols-2 px-4 py-3 text-sm ${
                index % 2 === 0 ? "bg-slate-50" : "bg-white"
              }`}
            >
              <span className="font-medium text-slate-700">{label}</span>
              <span className="text-right font-semibold text-slate-950">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
          Source: {marketData?.source || "MOCK"} market data cache. Bloomberg
          integration will replace this provider later.
        </div>
      </div>
    </div>
  );
}
function CommentModal({
  position,
  onClose,
  onSave,
}: {
  position: any | null;
  onClose: () => void;
  onSave: (payload: {
    securityId: string;
    positionId: string;
    tag: string;
    content: string;
  }) => Promise<void>;
}) {
  const [tag, setTag] = useState("COMMENT");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!position) return null;

  const latestComment = position.comments?.[0];

  async function handleSave() {
    setError("");

    if (!content.trim()) {
      setError("Please enter a comment.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        securityId: position.securityId,
        positionId: position.id,
        tag,
        content,
      });

      setContent("");
      setTag("COMMENT");
      onClose();
    } catch (error) {
      setError("Failed to save comment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const categories = [
    ["COMMENT", "Comment"],
    ["THESIS", "Thesis"],
    ["RISK", "Risk"],
    ["CATALYST", "Catalyst"],
    ["TRADE", "Trade"],
    ["EXIT", "Exit"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Comment Section
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {position.security.ticker} • timestamp and author are captured
              automatically
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-2">
          {categories.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTag(value)}
              className={`rounded-2xl px-3 py-2 text-sm ${
                tag === value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Existing comment:</span>{" "}
          {latestComment?.content || "No comment yet."}
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a comment, position note, trade rationale, market data observation, catalyst update, or exit rationale..."
          className="mt-4 h-36 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900"
        />

        {error ? (
          <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlagModal({
  position,
  onClose,
  onSave,
}: {
  position: any | null;
  onClose: () => void;
  onSave: (payload: {
    securityId: string;
    positionId: string;
    flagType: string;
    priority: string;
    description: string;
  }) => Promise<void>;
}) {
  const [flagType, setFlagType] = useState("Risk Review");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!position) return null;

  const flagTypes = [
    "Risk Review",
    "Earnings Upcoming",
    "Valuation Stretched",
    "Thesis Changed",
    "Candidate",
    "Under Review",
    "Margin Pressure",
    "Credit Watch",
    "Quality Risk",
    "Event-driven",
    "Custom",
  ];

  async function handleSave() {
    setError("");

    if (!flagType.trim()) {
      setError("Please select a flag type.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        securityId: position.securityId,
        positionId: position.id,
        flagType,
        priority,
        description,
      });

      setFlagType("Risk Review");
      setPriority("MEDIUM");
      setDescription("");
      onClose();
    } catch {
      setError("Failed to create flag. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Flag Ticker
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {position.security.ticker} • {position.security.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Flag Type
            </label>
            <select
              value={flagType}
              onChange={(event) => setFlagType(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            >
              {flagTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe why this ticker needs attention..."
              className="mt-2 h-28 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function DashboardClient({ positions }: DashboardClientProps) {
  const [localPositions, setLocalPositions] = useState<any[]>(positions);

  const [selectedPosition, setSelectedPosition] = useState<any | null>(
    positions[0] ?? null
  );

  const [marketDataPosition, setMarketDataPosition] = useState<any | null>(null);
  const [commentPosition, setCommentPosition] = useState<any | null>(null);
  const [flagPosition, setFlagPosition] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const userCanCreateComments = canCreateComments(currentUser?.role);
  const userCanCreateFlags = canCreateFlags(currentUser?.role);

  useEffect(() => {
    async function loadCurrentUser() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) return;

      const data = await response.json();
      setCurrentUser(data.user);
    }

    loadCurrentUser();
  }, []);

  const longPositions = useMemo(
  () => localPositions.filter((position) => position.side === "LONG"),
  [localPositions]
  );

  const shortPositions = useMemo(
    () => localPositions.filter((position) => position.side === "SHORT"),
    [localPositions]
  );

  const totalMarketValue = localPositions.reduce(
    (sum, position) => sum + (position.marketValue ?? 0),
    0
  );

  const weightedPnlProxy = localPositions.reduce(
    (sum, position) =>
      sum + ((position.marketValue ?? 0) * (position.totalPctChange ?? 0)) / 100,
    0
  );

  const dayPnl = localPositions.reduce(
    (sum, position) =>
      sum + ((position.marketValue ?? 0) * (position.dayPctChange ?? 0)) / 100,
    0
  );

  const commentedItems = localPositions.filter(
    (position) => position.comments?.length > 0
  ).length;

  async function handleSaveComment(payload: {
  securityId: string;
  positionId: string;
  tag: string;
  content: string;
}) {
  const response = await fetch("/api/comments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to save comment.");
  }

  const data = await response.json();
  const newComment = data.comment;

  setLocalPositions((currentPositions) =>
    currentPositions.map((position) => {
      if (position.id !== payload.positionId) return position;

      return {
        ...position,
        comments: [newComment, ...(position.comments || [])],
      };
    })
  );

  setSelectedPosition((currentPosition: any | null) => {
    if (!currentPosition || currentPosition.id !== payload.positionId) {
      return currentPosition;
    }

    return {
      ...currentPosition,
      comments: [newComment, ...(currentPosition.comments || [])],
    };
  });
}

function handleOpenComment(position: any) {
  setSelectedPosition(position);
  setCommentPosition(position);
}

async function handleSaveFlag(payload: {
  securityId: string;
  positionId: string;
  flagType: string;
  priority: string;
  description: string;
}) {
  const response = await fetch("/api/flags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create flag.");
  }

  const data = await response.json();
  const newFlag = data.flag;

  setLocalPositions((currentPositions) =>
    currentPositions.map((position) => {
      if (position.id !== payload.positionId) return position;

      return {
        ...position,
        flags: [newFlag, ...(position.flags || [])],
      };
    })
  );

  setSelectedPosition((currentPosition: any | null) => {
    if (!currentPosition || currentPosition.id !== payload.positionId) {
      return currentPosition;
    }

    return {
      ...currentPosition,
      flags: [newFlag, ...(currentPosition.flags || [])],
    };
  });
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
              <p className="text-xs text-slate-500">Portfolio operations hub</p>
            </div>
          </div>

          <nav className="space-y-2">
            <a
              href="/"
              className="block rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm"
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
            
    
          </nav>

          <div className="mt-auto rounded-3xl bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium">Compliance Mode</div>
            <p className="text-xs leading-5 text-slate-500">
              Comments, flags, market-data opens, and exports are designed to be
              audit logged. Trading actions are intentionally excluded.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Search ticker, company, side, sector, comments...
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="green">Live data mock</Badge>
              <CurrentUserPill />
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 overflow-auto p-6">
              <div className="space-y-5">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      Home Page / Position Display
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Long and short positions with prices, daily move, market
                      value, portfolio %, shares, WAP, total change, market data,
                      flags, and comments.
                    </p>
                  </div>

                  <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                    Quick Comment
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <StatCard
                    label="Net Equity"
                    value={formatMoney(totalMarketValue)}
                    sub={`${localPositions.length} active positions`}
                  />
                  <StatCard
                    label="Position P&L Proxy"
                    value={formatMoney(weightedPnlProxy)}
                    sub="Weighted by total % change"
                  />
                  <StatCard
                    label="Day P&L"
                    value={formatMoney(dayPnl)}
                    sub="Estimated intraday move"
                  />
                  <StatCard
                    label="Commented Items"
                    value={String(commentedItems)}
                    sub="Positions with comment history"
                  />

                  

                </div>
                
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                  {[
                    "All",
                    "Long",
                    "Short",
                    "Flagged",
                    "Technology",
                    "Semiconductors",
                  ].map((filter) => (
                    <button
                      key={filter}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        filter === "All"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}

                  <button className="ml-auto rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                    Sort: Total % Change
                  </button>
                </div>

                <PositionGrid
                  title="Long Positions"
                  tone="green"
                  positions={longPositions}
                  selectedId={selectedPosition?.id}
                  onSelect={setSelectedPosition}
                  onMarketData={setMarketDataPosition}
                  onComment={handleOpenComment}
                  canComment={userCanCreateComments}
                />

                
                <PositionGrid
                  title="Short Positions"
                  tone="red"
                  positions={shortPositions}
                  selectedId={selectedPosition?.id}
                  onSelect={setSelectedPosition}
                  onMarketData={setMarketDataPosition}
                  onComment={handleOpenComment}
                  canComment={userCanCreateComments}
                />
              </div>
            </div>

            
            <TickerDetailPanel
              position={selectedPosition}
              onClose={() => setSelectedPosition(null)}
              onComment={handleOpenComment}
              onMarketData={setMarketDataPosition}
              onFlag={setFlagPosition}
              canComment={userCanCreateComments}
              canFlag={userCanCreateFlags}
            />


            <MarketDataModal
              position={marketDataPosition}
              onClose={() => setMarketDataPosition(null)}
            />
            <CommentModal
              position={commentPosition}
              onClose={() => setCommentPosition(null)}
              onSave={handleSaveComment}
            />
            <FlagModal
              position={flagPosition}
              onClose={() => setFlagPosition(null)}
              onSave={handleSaveFlag}
            />
          </div>
        </section>
      </div>
    </main>
  );
}