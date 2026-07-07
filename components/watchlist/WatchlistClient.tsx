"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  canCreateComments,
  canEditWatchlist,
} from "@/lib/client-permissions";
import CurrentUserPill from "@/components/auth/CurrentUserPill";

type WatchlistClientProps = {
  initialEntries: any[];
  portfolioSecurities: any[];
};

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

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}


function getCapitalIqUrl(ticker: string) {
  const normalizedTicker = ticker.trim().toLowerCase();

  return `https://www.capitaliq.spglobal.com/apisv3/spg-webplatform-core/search/searchResults?vertical=&q=${encodeURIComponent(
    normalizedTicker
  )}`;
}

function openCapitalIq(ticker: string) {
  window.open(getCapitalIqUrl(ticker), "_blank");
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

function pctClass(value: number | null | undefined) {
  if (value == null) return "text-slate-500";
  return value >= 0 ? "text-emerald-600" : "text-rose-600";
}

function getWatchlistCurrentPrice(entry: any) {
  const marketData = entry.security?.marketData?.[0];

  if (marketData?.marketDataSource !== "FINNHUB") {
    return null;
  }

  const currentPrice = Number(marketData.currentPrice);

  if (!Number.isFinite(currentPrice)) {
    return null;
  }

  return currentPrice;
}

function calculateFromTarget(
  currentPrice?: number | null,
  targetPrice?: number | null
) {
  if (currentPrice == null || targetPrice == null || currentPrice === 0) {
    return null;
  }

  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}


function WatchlistGrid({
    title,
    tone,
    entries,
    onSelect,
    onMarketData,
    onComment,
    onEdit,
    onRemove,
    canComment,
    canEdit,
  }: {
    title: string;
    tone: "green" | "red";
    entries: any[];
    onSelect: (entry: any) => void;
    onMarketData: (entry: any) => void;
    onComment: (entry: any) => void;
    onEdit: (entry: any) => void;
    onRemove: (entry: any) => void;
    canComment: boolean;
    canEdit: boolean;
  }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <SectionBar title={title} tone={tone} />

      <div className="overflow-x-auto">
       <div className="grid min-w-[1050px] grid-cols-8 border-b bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <div className="col-span-2">Ticker # / Name</div>
          <div>Current Price</div>
          <div>{tone === "green" ? "Buy PT" : "Short PT"}</div>
          <div>% From PT</div>
          <div>Market Data</div>
          <div>Comment Section</div>
          <div>Actions</div>
        </div>

        {entries.map((entry) => {
          const currentPrice = getWatchlistCurrentPrice(entry);
          const fromTarget = calculateFromTarget(currentPrice, entry.targetPrice);
          const openFlag = entry.flags?.[0];         
          const latestComment = entry.comments?.find(
            (comment: any) => comment.tag !== "PT"
          );

          return (
            <div
              key={entry.id}
              className="grid min-w-[1050px] grid-cols-8 items-center border-b border-slate-100 px-4 py-3 text-xs transition hover:bg-slate-50"
            >
              
              <button
                onClick={() => onSelect(entry)}
                className="col-span-2 flex items-center gap-1 text-left font-semibold text-slate-950 hover:underline"
              >
                {entry.security.ticker}
                {openFlag ? (
                  <span className="text-amber-500" title={openFlag.flagType}>
                    ⚑
                  </span>
                ) : null}
                <span className="ml-1 truncate font-normal text-slate-500">
                  {entry.security.name}
                </span>
              </button>


              <div>{currentPrice != null ? `$${currentPrice.toFixed(2)}` : "—"}</div>

              <div>{entry.targetPrice != null ? `$${entry.targetPrice.toFixed(2)}` : "—"}</div>

             
              <div className={`font-semibold ${pctClass(fromTarget)}`}>
                {formatPercent(fromTarget)}
              </div>


              <div>
                <button
                  onClick={() => openCapitalIq(entry.security.ticker)}
                  className="rounded-xl bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200"
                >
                  Capital IQ
                </button>
              </div>

              <div>
                {canComment ? (
                  <button
                    onClick={() => onComment(entry)}
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

              <div className="flex gap-2">
                {canEdit ? (
                  <>
                    <button
                      onClick={() => onEdit(entry)}
                      className="rounded-xl bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => onRemove(entry)}
                      className="rounded-xl bg-rose-50 px-2 py-1 font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </>
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

function MarketDataModal({
  entry,
  onClose,
}: {
  entry: any | null;
  onClose: () => void;
}) {
  if (!entry) return null;

  const security = entry.security;
  const marketData = security.marketData?.[0];

  const rows = [
    ["VWAP", marketData?.vwap != null ? `$${marketData.vwap.toFixed(2)}` : "N/A"],
    ["52 Week High", marketData?.high52w != null ? `$${marketData.high52w.toFixed(2)}` : "N/A"],
    ["52 Week Low", marketData?.low52w != null ? `$${marketData.low52w.toFixed(2)}` : "N/A"],
    ["Beta", marketData?.beta != null ? marketData.beta.toFixed(2) : "N/A"],
    [
      "Avg Volume",
      marketData?.avgVolume != null
        ? marketData.avgVolume.toLocaleString("en-US", { maximumFractionDigits: 0 })
        : "N/A",
    ],
    ["Short Float", marketData?.shortFloat != null ? `${marketData.shortFloat}%` : "N/A"],
    ["Market Cap", marketData?.marketCap != null ? formatMoney(marketData.marketCap) : "N/A"],
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
            <h2 className="text-xl font-semibold text-slate-950">Market Data</h2>
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
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Market Data Source</span>
            <span className="text-right font-semibold text-slate-950">
              {marketData?.marketDataSource ?? "N/A"}
            </span>
            <span className="font-medium text-slate-700">Fundamentals Source</span>
            <span className="text-right font-semibold text-slate-950">
              {marketData?.fundamentalsSource ?? "N/A"}
            </span>
            <span className="font-medium text-slate-700">Data Quality</span>
            <span className="text-right font-semibold text-slate-950">
              {marketData?.dataQuality ?? "N/A"}
            </span>
            <span className="font-medium text-slate-700">Last Market Refresh</span>
            <span className="text-right font-semibold text-slate-950">
              {marketData?.lastMarketDataRefreshAt
                ? formatDateTime(marketData.lastMarketDataRefreshAt)
                : "N/A"}
            </span>
            <span className="font-medium text-slate-700">Last Fundamentals Refresh</span>
            <span className="text-right font-semibold text-slate-950">
              {marketData?.lastFundamentalsRefreshAt
                ? formatDateTime(marketData.lastFundamentalsRefreshAt)
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
function WatchlistDetailPanel({
  entry,
  onClose,
  onEdit,
  onRemove,
  canEdit,
}: {
  entry: any | null;
  onClose: () => void;
  onEdit: (entry: any) => void;
  onRemove: (entry: any) => void;
  canEdit: boolean;
}) {
  if (!entry) return null;

  const security = entry.security;
  const marketData = security.marketData?.[0];
  const currentPrice = getWatchlistCurrentPrice(entry);
  const fromTarget = calculateFromTarget(currentPrice, entry.targetPrice);

  const comments =
  entry.comments?.filter((comment: any) => comment.tag !== "PT") || [];

  const ptComments =
    entry.comments?.filter((comment: any) => comment.tag === "PT") || [];

  const latestComment = comments[0] ?? null;

  return (
      <aside className="flex h-full w-[460px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl">      
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-950">
                {security.ticker}
              </h2>

              <Badge tone={entry.side === "SHORT" ? "red" : "green"}>
                {entry.side}
              </Badge>
            </div>

            <p className="mt-1 text-sm text-slate-500">{security.name}</p>
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
              {formatMoney(currentPrice)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">
              {entry.side === "SHORT" ? "Short PT" : "Buy PT"}
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {formatMoney(entry.targetPrice)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">% From PT</p>
            <p className={`mt-1 font-semibold ${pctClass(fromTarget)}`}>
              {formatPercent(fromTarget)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Market Data Source</p>
            <p className="mt-1 font-semibold text-slate-950">
              {marketData?.marketDataSource ?? "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <button
                onClick={() => onEdit(entry)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>

              <button
                onClick={() => onRemove(entry)}
                className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <section>
          <h3 className="mb-3 font-semibold text-slate-950">Notes</h3>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {entry.notes || "No notes added yet."}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-3 font-semibold text-slate-950">Comment Section</h3>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Latest Comment
            </div>
            <div>
              {latestComment?.content || "No comment added yet."}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-3 font-semibold text-slate-950">Comment Timeline</h3>

          <div className="space-y-3">
            {comments.length ? (
              comments.map((comment: any) => (
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

        <section className="mt-5">
          <h3 className="mb-3 font-semibold text-slate-950">PT History</h3>

          <div className="space-y-3">
            {ptComments.length ? (
              ptComments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-blue-100 bg-blue-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge tone="blue">PT</Badge>
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
                No PT history yet.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-3 font-semibold text-slate-950">Refresh Info</h3>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            <div className="flex justify-between gap-4">
              <span>Last Market Refresh</span>
              <span className="font-semibold text-slate-800">
                {marketData?.lastMarketDataRefreshAt
                  ? formatDateTime(marketData.lastMarketDataRefreshAt)
                  : "N/A"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}


function AddStockModal({
  open,
  onClose,
  onAdd,
  portfolioSecurities,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: {
    ticker: string;
    side: string;
    targetPrice: string;
    comment: string;
  }) => Promise<void>;
  portfolioSecurities: any[];
}) {


  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState("LONG");
  const [targetPrice, setTargetPrice] = useState("");
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit() {
    setError("");

    if (!ticker.trim()) {
      setError("Ticker is required.");
      return;
    }

    setIsSaving(true);

    try {
      await onAdd({
        ticker,
        side,
        targetPrice,
        comment,
      });

      setTicker("");
      setSide("LONG");
      setTargetPrice("");
      setComment("");
      onClose();
    } catch {
      setError("Failed to add stock. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Add Watchlist Stock
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add to the long or short watchlist.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <input
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Ticker, e.g. AMD"
          />

          {portfolioSecurities.length ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current Portfolio
              </p>

              <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
                {portfolioSecurities.map((security: any) => (
                  <button
                    key={security.id}
                    type="button"
                    onClick={() => setTicker(security.ticker)}
                    className="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    title={security.name}
                  >
                    {security.ticker}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <select
            value={side}
            onChange={(event) => setSide(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="LONG">Long Watchlist</option>
            <option value="SHORT">Short Watchlist</option>
          </select>

          <input
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Buy PT / Short PT"
          />

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="h-28 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Comment section..."
          />
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
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Adding..." : "Add Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditWatchlistModal({
  entry,
  onClose,
  onSave,
}: {
  entry: any | null;
  onClose: () => void;
  onSave: (entry: any, payload: {
    side: string;
    targetPrice: string;
    notes: string;
    ptChangeComment: string;
  }) => Promise<void>;
}) {
  const [side, setSide] = useState("LONG");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [ptChangeComment, setPtChangeComment] = useState("");
  const originalTargetPrice = entry?.targetPrice != null ? String(entry.targetPrice) : "";
  const targetPriceChanged = String(targetPrice || "") !== originalTargetPrice;

  
  useEffect(() => {
    if (!entry) return;

    setSide(entry.side || "LONG");
    setTargetPrice(entry.targetPrice != null ? String(entry.targetPrice) : "");
    setNotes(entry.notes || "");
    setPtChangeComment("");
    setError("");
  }, [entry]);


  if (!entry) return null;

    async function handleSave() {
      setError("");

      if (targetPriceChanged && !ptChangeComment.trim()) {
        setError("Please enter a reason for changing the price target.");
        return;
      }

      setIsSaving(true);

      try {
        await onSave(entry, {
          side,
          targetPrice,
          notes,
          ptChangeComment,
        });

        onClose();
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to update watchlist item."
        );
      } finally {
        setIsSaving(false);
      }
    }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Edit Watchlist Item
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {entry.security.ticker} • {entry.security.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <select
            value={side}
            onChange={(event) => setSide(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="LONG">Long Watchlist</option>
            <option value="SHORT">Short Watchlist</option>
          </select>

          <input
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Buy PT / Short PT"
          />

          {targetPriceChanged ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Reason for PT Change Required
              </label>
              <textarea
                value={ptChangeComment}
                onChange={(event) => setPtChangeComment(event.target.value)}
                className="mt-2 h-24 w-full resize-none rounded-2xl border border-amber-200 bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Explain why the price target is changing..."
              />
            </div>
          ) : null}

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="h-28 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Watchlist notes..."
          />
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
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentModal({
  entry,
  onClose,
  onSave,
}: {
  entry: any | null;
  onClose: () => void;
  onSave: (payload: {
    securityId: string;
    watchlistEntryId: string;
    tag: string;
    content: string;
  }) => Promise<void>;
}) {
  const [tag, setTag] = useState("COMMENT");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!entry) return null;

  const latestComment = entry.comments?.[0];

  async function handleSave() {
    setError("");

    if (!content.trim()) {
      setError("Please enter a comment.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        securityId: entry.securityId,
        watchlistEntryId: entry.id,
        tag,
        content,
      });

      setContent("");
      setTag("COMMENT");
      onClose();
    } catch {
      setError("Failed to save comment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const categories = [
    ["COMMENT", "Comment"],
    ["PT", "PT"],
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
              {entry.security.ticker} • timestamp and author are captured automatically
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
          {latestComment?.content || entry.notes || "No comment yet."}
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a watchlist note, thesis, risk, catalyst, or trade setup..."
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
export default function WatchlistClient({
  initialEntries,
  portfolioSecurities,
}: WatchlistClientProps) {
  const [entries, setEntries] = useState<any[]>(initialEntries);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [marketDataEntry, setMarketDataEntry] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const userCanEditWatchlist = canEditWatchlist(currentUser?.role);
  const userCanCreateComments = canCreateComments(currentUser?.role);
  const [commentEntry, setCommentEntry] = useState<any | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);

  useEffect(() => {
  async function loadCurrentUser() {
    const response = await fetch("/api/auth/me");

    if (!response.ok) return;

    const data = await response.json();
    setCurrentUser(data.user);
  }

  loadCurrentUser();
}, []);
  const filteredEntries = useMemo(() => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return entries;

  return entries.filter((entry) => {
    const commentText =
    entry.comments?.map((comment: any) => comment.content).join(" ") || "";
    const flagText =
      entry.flags?.map((flag: any) => flag.flagType).join(" ") || "";

    const searchable = [
      entry.security?.ticker,
      entry.security?.name,
      entry.security?.sector,
      entry.side,
      entry.targetPrice,
      entry.notes,
      commentText,
      flagText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}, [entries, query]);

const longEntries = useMemo(
  () => filteredEntries.filter((entry) => entry.side === "LONG"),
  [filteredEntries]
);

const shortEntries = useMemo(
  () => filteredEntries.filter((entry) => entry.side === "SHORT"),
  [filteredEntries]
);

  async function handleAddEntry(payload: {
    ticker: string;
    side: string;
    targetPrice: string;
    comment: string;
  }) {
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to add watchlist entry.");
    }

    const data = await response.json();

    setEntries((currentEntries) => [data.entry, ...currentEntries]);
  }

  async function handleSaveComment(payload: {
  securityId: string;
  watchlistEntryId: string;
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

    setEntries((currentEntries: any[]) =>
      currentEntries.map((entry) => {
        if (entry.id !== payload.watchlistEntryId) return entry;

        return {
          ...entry,
          comments: [newComment, ...(entry.comments || [])],
        };
      })
    );

    setSelectedEntry((currentEntry: any | null) => {
      if (!currentEntry || currentEntry.id !== payload.watchlistEntryId) {
        return currentEntry;
      }

      return {
        ...currentEntry,
        comments: [newComment, ...(currentEntry.comments || [])],
      };
    });

  }

  async function handleSaveEdit(
    entry: any,
    payload: {
      side: string;
      targetPrice: string;
      notes: string;
      ptChangeComment: string;
    }
  ) {

  const response = await fetch(`/api/watchlist/${entry.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.detail || "Failed to update watchlist item.");
  }

  const updatedEntry = data.watchlistEntry;

    
  setEntries((currentEntries: any[]) =>
    currentEntries.map((currentEntry: any) =>
      currentEntry.id === updatedEntry.id ? updatedEntry : currentEntry
    )
  );

  setSelectedEntry((currentEntry: any | null) =>
    currentEntry?.id === updatedEntry.id ? updatedEntry : currentEntry
  );

}

async function handleRemoveEntry(entry: any) {
    const confirmed = window.confirm(
      `Remove ${entry.security.ticker} from the watchlist?`
    );

    if (!confirmed) return;

    const response = await fetch(`/api/watchlist/${entry.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    

    if (!response.ok) {
  throw new Error(data.error || data.detail || "Failed to remove watchlist item.");
}

  setEntries((currentEntries: any[]) =>
    currentEntries.filter((currentEntry: any) => currentEntry.id !== entry.id)
  );

  setSelectedEntry((currentEntry: any | null) =>
    currentEntry?.id === entry.id ? null : currentEntry
  );

  setEditingEntry((currentEntry: any | null) =>
    currentEntry?.id === entry.id ? null : currentEntry
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
              <p className="text-xs text-slate-500">Portfolio operations hub</p>
            </div>
          </div>

          <nav className="space-y-2">
                <Link
                    href="/"
                    className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                    Home / Positions
                </Link>

                <Link
                    href="/watchlist"
                    className="block rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm"
                >
                    Watchlist
                </Link>

                <Link
                    href="/past-positions"
                    className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                    Past Positions
                </Link>

                <Link
                    href="/comments"
                    className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                    Comments
                </Link>

                <Link
                    href="/alerts"
                    className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                    Alerts
                </Link>

                <Link
                    href="/settings"
                    className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                    Settings
                </Link>
                </nav>

          <div className="mt-auto rounded-3xl bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium">Compliance Mode</div>
            <p className="text-xs leading-5 text-slate-500">
              Watchlist changes, comments, flags, and market-data opens are
              designed to be audit logged.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">Watchlist</p>
              <p className="text-xs text-slate-500">Long and short idea pipeline</p>
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="green">Finnhub current prices</Badge>
              <CurrentUserPill />
            </div>
          </header>

                      
            <div className="flex min-h-0 flex-1">
                        <div className="min-w-0 flex-1 overflow-auto p-6">
                          <div className="space-y-5">
                            <div className="flex items-end justify-between">
                              <div>
                                <h2 className="text-3xl font-semibold tracking-tight">
                                  Watchlist
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                  Long and short watchlists with current price, buy/short
                                  point, percent from point, market data, flags, and comments.
                                </p>
                              </div>

                              {userCanEditWatchlist ? (
                                <button
                                  onClick={() => setAddModalOpen(true)}
                                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                                >
                                  Add Stock
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="cursor-not-allowed rounded-2xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
                                >
                                  Read Only
                                </button>
                              )}
                            </div>
                              <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Long Watchlist
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {longEntries.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Potential long ideas
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Short Watchlist
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {shortEntries.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Potential short ideas
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Commented Names
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {entries.filter((entry) => entry.comments?.length > 0).length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  With comment history
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ticker, company, sector, side, target price, notes, comments, flags..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <WatchlistGrid
              title="Long Watchlist"
              tone="green"
              entries={longEntries}
              onSelect={setSelectedEntry}
              onMarketData={setMarketDataEntry}
              onComment={setCommentEntry}
              onEdit={setEditingEntry}
              onRemove={handleRemoveEntry}
              canComment={userCanCreateComments}
              canEdit={userCanEditWatchlist}
            />

            <WatchlistGrid
              title="Short Watchlist"
              tone="red"
              entries={shortEntries}
              onSelect={setSelectedEntry}
              onMarketData={setMarketDataEntry}
              onComment={setCommentEntry}
              onEdit={setEditingEntry}
              onRemove={handleRemoveEntry}
              canComment={userCanCreateComments}
              canEdit={userCanEditWatchlist}
            />
                
              </div>
            </div>

            <WatchlistDetailPanel
              entry={selectedEntry}
              onClose={() => setSelectedEntry(null)}
              onEdit={setEditingEntry}
              onRemove={handleRemoveEntry}
              canEdit={userCanEditWatchlist}
            />
          </div>
        </section>
      </div>


            
      <AddStockModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddEntry}
        portfolioSecurities={portfolioSecurities}
      />

      <EditWatchlistModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEdit}
      />
      <MarketDataModal
        entry={marketDataEntry}
        onClose={() => setMarketDataEntry(null)}
      />
     
      <CommentModal
        entry={commentEntry}
        onClose={() => setCommentEntry(null)}
        onSave={handleSaveComment}
      />
    </main>
  );
}