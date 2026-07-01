"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PastPositionsClientProps = {
  initialPositions: any[];
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

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function pnlClass(value: number | null | undefined) {
  if (value == null) return "text-slate-500";
  return value >= 0 ? "text-emerald-600" : "text-rose-600";
}

function SectionBar() {
  return (
    <div className="rounded-t-2xl bg-yellow-300 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-slate-950">
      Past Positions
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
  const [tag, setTag] = useState("EXIT");
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
      setTag("EXIT");
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
              {position.security.ticker} • timestamp and author are captured automatically
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
          {latestComment?.content || position.exitRationale || "No comment yet."}
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write an exit rationale, trade note, risk update, thesis change, or post-position review..."
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

function PastPositionsGrid({
  positions,
  onComment,
}: {
  positions: any[];
  onComment: (position: any) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <SectionBar />

      <div className="grid grid-cols-7 border-b bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <div>Ticker</div>
        <div className="col-span-2">Company Name</div>
        <div>Price Bought/Sold</div>
        <div>Price Sold/Covered</div>
        <div>Total % Change</div>
        <div>Comment Section</div>
      </div>

      {positions.map((position) => {
        const entryPrice = position.wap;
        const exitValuePerShare =
          position.shares && position.marketValue
            ? position.marketValue / position.shares
            : null;

        const entryLabel =
          position.side === "SHORT"
            ? `${formatMoney(entryPrice)} Sold Short`
            : `${formatMoney(entryPrice)} Bought`;

        const exitLabel =
          position.side === "SHORT"
            ? `${formatMoney(exitValuePerShare)} Covered`
            : `${formatMoney(exitValuePerShare)} Sold`;

        return (
          <div
            key={position.id}
            className="grid grid-cols-7 items-center border-b border-slate-100 px-4 py-3 text-xs hover:bg-slate-50"
          >
            <div className="font-semibold text-slate-950">
              {position.security.ticker}
            </div>

            <div className="col-span-2 text-slate-600">
              {position.security.name}
            </div>

            <div>{entryLabel}</div>

            <div>{exitLabel}</div>

            <div className={`font-semibold ${pnlClass(position.totalPctChange)}`}>
              {position.totalPctChange != null
                ? `${position.totalPctChange >= 0 ? "+" : ""}${position.totalPctChange.toFixed(1)}%`
                : "—"}
            </div>

            <div>
              <button
                onClick={() => onComment(position)}
                className="rounded-xl bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100"
              >
                Comment
              </button>
            </div>

            <div className="col-span-7 mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Exit rationale:
              </span>{" "}
              {position.exitRationale || position.comments?.[0]?.content || "No exit rationale recorded."}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PastPositionsClient({
  initialPositions,
}: PastPositionsClientProps) {
  const [positions, setPositions] = useState<any[]>(initialPositions);
  const [commentPosition, setCommentPosition] = useState<any | null>(null);

  const closedPositions = useMemo(
    () => positions.filter((position) => position.status === "CLOSED"),
    [positions]
  );

  const winners = closedPositions.filter(
    (position) => (position.totalPctChange ?? 0) >= 0
  ).length;

  const losers = closedPositions.filter(
    (position) => (position.totalPctChange ?? 0) < 0
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

    setPositions((currentPositions) =>
      currentPositions.map((position) => {
        if (position.id !== payload.positionId) return position;

        return {
          ...position,
          comments: [newComment, ...(position.comments || [])],
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
                    className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                    Watchlist
                </Link>

                <Link
                    href="/past-positions"
                    className="block rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm"
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
              Closed positions, exit rationales, comments, and audit history are retained for review.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Search ticker, company, exit rationale, or comments...
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="green">Live data mock</Badge>
              <div className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                Joseph Moore
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-auto p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Past Positions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Closed positions with bought/sold or sold/covered prices, exit rationale, and comment section.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Closed Positions
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {closedPositions.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Historical completed names
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Winners
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">
                    {winners}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Positive realized proxy
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Losers
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-rose-600">
                    {losers}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Negative realized proxy
                  </p>
                </div>
              </div>

              <PastPositionsGrid
                positions={closedPositions}
                onComment={setCommentPosition}
              />
            </div>
          </div>
        </section>
      </div>

      <CommentModal
        position={commentPosition}
        onClose={() => setCommentPosition(null)}
        onSave={handleSaveComment}
      />
    </main>
  );
}