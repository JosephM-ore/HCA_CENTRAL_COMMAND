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

function pctClass(value: number | null | undefined) {
  if (value == null) return "text-slate-500";
  return value >= 0 ? "text-emerald-600" : "text-rose-600";
}

function calculateFromTarget(currentPrice?: number | null, targetPrice?: number | null) {
  if (currentPrice == null || targetPrice == null || targetPrice === 0) return null;
  return ((currentPrice - targetPrice) / targetPrice) * 100;
}

function WatchlistGrid({
  title,
  tone,
  entries,
  onMarketData,
  onComment,
  canComment,
}: {
  title: string;
  tone: "green" | "red";
  entries: any[];
  onMarketData: (entry: any) => void;
  onComment: (entry: any) => void;
  canComment: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <SectionBar title={title} tone={tone} />

      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-7 border-b bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <div className="col-span-2">Ticker # / Name</div>
          <div>Current Price</div>
          <div>{tone === "green" ? "Buy PT" : "Short PT"}</div>
          <div>% From PT</div>
          <div>Market Data</div>
          <div>Comment Section</div>
        </div>

        {entries.map((entry) => {
          const marketData = entry.security.marketData?.[0];
          const currentPrice = marketData?.currentPrice ?? null;
          const fromTarget = calculateFromTarget(currentPrice, entry.targetPrice);
          const openFlag = entry.flags?.[0];
          const latestComment = entry.comments?.[0];

          return (
            <div
              key={entry.id}
              className="grid min-w-[900px] grid-cols-7 items-center border-b border-slate-100 px-4 py-3 text-xs transition hover:bg-slate-50"
            >
              <div className="col-span-2 flex items-center gap-1 font-semibold text-slate-950">
                {entry.security.ticker}
                {openFlag ? (
                  <span className="text-amber-500" title={openFlag.flagType}>
                    ⚑
                  </span>
                ) : null}
                <span className="ml-1 truncate font-normal text-slate-500">
                  {entry.security.name}
                </span>
              </div>

              <div>{currentPrice != null ? `$${currentPrice.toFixed(2)}` : "—"}</div>

              <div>{entry.targetPrice != null ? `$${entry.targetPrice.toFixed(2)}` : "—"}</div>

              <div className={`font-semibold ${pctClass(fromTarget)}`}>
                {fromTarget != null
                  ? `${fromTarget >= 0 ? "+" : ""}${fromTarget.toFixed(1)}%`
                  : "—"}
              </div>

              <div>
                <button
                  onClick={() => onMarketData(entry)}
                  className="rounded-xl bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200"
                >
                  Market Data
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
      </div>
    </div>
  );
}

function AddStockModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: {
    ticker: string;
    side: string;
    targetPrice: string;
    comment: string;
  }) => Promise<void>;
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
}: WatchlistClientProps) {
  const [entries, setEntries] = useState<any[]>(initialEntries);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [marketDataEntry, setMarketDataEntry] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const userCanEditWatchlist = canEditWatchlist(currentUser?.role);
  const userCanCreateComments = canCreateComments(currentUser?.role);
  const [commentEntry, setCommentEntry] = useState<any | null>(null);


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
    const latestComment = entry.comments?.[0]?.content || "";
    const flagText =
      entry.flags?.map((flag: any) => flag.flagType).join(" ") || "";

    const searchable = [
      entry.security?.ticker,
      entry.security?.name,
      entry.security?.sector,
      entry.side,
      entry.targetPrice,
      entry.notes,
      latestComment,
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
              <Badge tone="green">Live data mock</Badge>
              <CurrentUserPill />
            </div>
          </header>

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
                onMarketData={setMarketDataEntry}
                onComment={setCommentEntry}
                canComment={userCanCreateComments}
              />


              <WatchlistGrid
                title="Short Watchlist"
                tone="red"
                entries={shortEntries}
                onMarketData={setMarketDataEntry}
                onComment={setCommentEntry}
                canComment={userCanCreateComments}
              />
            </div>
          </div>
        </section>
      </div>

      <AddStockModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddEntry}
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