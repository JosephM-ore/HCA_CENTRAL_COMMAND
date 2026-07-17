"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/common/Badge";
import LocalDateTime from "@/components/common/LocalDateTime";
import { getDisplayCurrentPrice } from "@/lib/dashboard/position-metrics";
import {
  buildTradeHistoryAnalytics,
  type TradeHistoryRow,
} from "@/lib/dashboard/trade-history-analytics";

type TradeFilter = "ALL" | "ENTRIES" | "EXITS";
type TradeSort = "NEWEST" | "OLDEST";

type ExpandedTradeHistoryModalProps = {
  position: any | null;
  onClose: () => void;
};

function formatMoney(
  value: number | null | undefined
) {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPrice(
  value: number | null | undefined
) {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(
  value: number | null | undefined
) {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatPercent(
  value: number | null | undefined
) {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(
    1
  )}%`;
}

function percentageClass(
  value: number | null | undefined
) {
  if (value == null) {
    return "text-slate-500";
  }

  return value >= 0
    ? "text-emerald-600"
    : "text-rose-600";
}

function sourceTone(source?: string | null) {
  if (source === "WELLS_FARGO") {
    return "green";
  }

  if (source === "MANUAL") {
    return "amber";
  }

  return "slate";
}

function formatSource(source?: string | null) {
  if (source === "WELLS_FARGO") {
    return "Wells";
  }

  if (source === "MANUAL") {
    return "Manual";
  }

  return source || "Unknown";
}

function reconciliationTone(
  status?: string | null
) {
  if (status === "MATCHED") {
    return "blue";
  }

  if (status === "REVIEW_REQUIRED") {
    return "red";
  }

  if (status === "MANUAL_PENDING") {
    return "amber";
  }

  return "slate";
}

function formatReconciliationStatus(
  status?: string | null
) {
  if (!status) {
    return "—";
  }

  return status
    .split("_")
    .map(
      (word) =>
        `${word.charAt(0)}${word
          .slice(1)
          .toLowerCase()}`
    )
    .join(" ");
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-2 text-xl font-semibold text-slate-950">
        {value}
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function TradeHistoryTableRow({
  row,
}: {
  row: TradeHistoryRow;
}) {
  return (
    <div className="grid min-w-[1650px] grid-cols-12 items-center gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0 hover:bg-slate-50">
      <div>
        <LocalDateTime
          value={row.trade.dateTraded}
          className="text-xs text-slate-700"
        />
      </div>

      <div>
        <Badge
          tone={
            row.isEntry
              ? "green"
              : row.isExit
                ? "red"
                : "slate"
          }
        >
          {row.tradeType}
        </Badge>
      </div>

      <div className="font-medium text-slate-950">
        {formatNumber(row.absoluteShares)}
      </div>

      <div>
        {formatPrice(row.trade.avgPrice)}
      </div>

      <div>{formatMoney(row.notional)}</div>

      <div>
        {formatNumber(row.positionBefore)}
      </div>

      <div>
        {formatNumber(row.positionAfter)}
      </div>

      <div
        className={`font-semibold ${
          row.positionChangePct == null
            ? "text-slate-600"
            : percentageClass(
                row.positionChangePct
              )
        }`}
      >
        {row.positionChangeLabel}
      </div>

      <div
        className={`font-semibold ${percentageClass(
          row.executionVsCurrentPct
        )}`}
      >
        {formatPercent(
          row.executionVsCurrentPct
        )}
      </div>

      <div>
        <Badge
          tone={
            sourceTone(
              row.trade.source
            ) as "green" | "amber" | "slate"
          }
        >
          {formatSource(row.trade.source)}
        </Badge>
      </div>

      <div>
        {row.trade.reconciliationStatus ? (
          <Badge
            tone={
              reconciliationTone(
                row.trade
                  .reconciliationStatus
              ) as
                | "blue"
                | "red"
                | "amber"
                | "slate"
            }
          >
            {formatReconciliationStatus(
              row.trade
                .reconciliationStatus
            )}
          </Badge>
        ) : (
          <span className="text-slate-400">
            —
          </span>
        )}
      </div>

      <div
        title={row.trade.comment || ""}
        className="truncate text-slate-500"
      >
        {row.trade.comment || "—"}
      </div>
    </div>
  );
}

export default function ExpandedTradeHistoryModal({
  position,
  onClose,
}: ExpandedTradeHistoryModalProps) {
  const [tradeFilter, setTradeFilter] =
    useState<TradeFilter>("ALL");

  const [tradeSort, setTradeSort] =
    useState<TradeSort>("NEWEST");

  const currentPrice = position
    ? getDisplayCurrentPrice(position)
    : null;

  const analytics = useMemo(
    () =>
      buildTradeHistoryAnalytics({
        positionSide:
          position?.side || "LONG",
        currentShares:
          position?.shares ?? null,
        currentPrice,
        trades: Array.isArray(
          position?.trades
        )
          ? position.trades
          : [],
      }),
    [position, currentPrice]
  );

  const displayedRows = useMemo(() => {
    const filteredRows =
      analytics.rows.filter((row) => {
        if (tradeFilter === "ENTRIES") {
          return row.isEntry;
        }

        if (tradeFilter === "EXITS") {
          return row.isExit;
        }

        return true;
      });

    if (tradeSort === "OLDEST") {
      return [...filteredRows].reverse();
    }

    return filteredRows;
  }, [
    analytics.rows,
    tradeFilter,
    tradeSort,
  ]);

  if (!position) {
    return null;
  }

  const isShort =
    position.side === "SHORT";

  const entryLabel = isShort
    ? "Avg Short Price"
    : "Avg Buy Price";

  const exitLabel = isShort
    ? "Avg Cover Price"
    : "Avg Sell Price";

  const currentExposure =
    Math.abs(Number(position.shares) || 0);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-[1800px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-950">
                Expanded Trade History
              </h2>

              <Badge
                tone={
                  isShort ? "red" : "green"
                }
              >
                {position.side}
              </Badge>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {position.security.ticker} •{" "}
              {position.security.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <section>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <SummaryCard
                label="Current Position"
                value={
                  <span>
                    {formatNumber(
                      currentExposure
                    )}{" "}
                    <span className="text-sm text-slate-500">
                      {isShort
                        ? "Short"
                        : "Long"}
                    </span>
                  </span>
                }
                detail="Current Wells exposure"
              />

              <SummaryCard
                label="Trade Count"
                value={analytics.tradeCount}
                detail={`${analytics.entryTradeCount} entries • ${analytics.exitTradeCount} exits`}
              />

              <SummaryCard
                label="Shares Traded"
                value={formatNumber(
                  analytics.totalSharesTraded
                )}
                detail="Absolute share activity"
              />

              <SummaryCard
                label="Gross Notional"
                value={formatMoney(
                  analytics.grossTradeNotional
                )}
                detail="Absolute traded notional"
              />

              <SummaryCard
                label={entryLabel}
                value={formatPrice(
                  analytics.weightedEntryPrice
                )}
                detail="Share-weighted entries"
              />

              <SummaryCard
                label={exitLabel}
                value={formatPrice(
                  analytics.weightedExitPrice
                )}
                detail="Share-weighted exits"
              />
            </div>
          </section>

          <section className="mt-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">
                  First Trade
                </p>

                <div className="mt-1 font-semibold text-slate-950">
                  <LocalDateTime
                    value={
                      analytics.firstTradeAt
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">
                  Most Recent Trade
                </p>

                <div className="mt-1 font-semibold text-slate-950">
                  <LocalDateTime
                    value={
                      analytics.mostRecentTradeAt
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">
                  Days Since Last Trade
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {analytics.daysSinceLastTrade ??
                    "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">
                  Largest Add
                </p>

                <p
                  className={`mt-1 font-semibold ${percentageClass(
                    analytics.largestAddPct
                  )}`}
                >
                  {formatPercent(
                    analytics.largestAddPct
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">
                  Largest Reduction
                </p>

                <p
                  className={`mt-1 font-semibold ${percentageClass(
                    analytics.largestReductionPct
                  )}`}
                >
                  {formatPercent(
                    analytics.largestReductionPct
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-4">
            {analytics.historyIsComplete ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                The loaded trade history
                reconstructs to zero starting
                exposure and reconciles to the
                current position.
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                <span className="font-semibold">
                  Partial trade history.
                </span>{" "}
                The loaded trades reconstruct to a
                starting exposure of{" "}
                <span className="font-semibold">
                  {formatNumber(
                    analytics.derivedStartingExposure
                  )}
                </span>
                . Position Before, Position After,
                and percentage-change values are
                estimates based on the currently
                available visible trade history.
              </div>
            )}
          </section>

          <section className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ALL", "All"],
                    ["ENTRIES", "Entries"],
                    ["EXITS", "Exits"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setTradeFilter(value)
                    }
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      tradeFilter === value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Showing {displayedRows.length} of{" "}
                  {analytics.tradeCount} trades
                </span>

                <select
                  value={tradeSort}
                  onChange={(event) =>
                    setTradeSort(
                      event.target
                        .value as TradeSort
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="NEWEST">
                    Newest First
                  </option>
                  <option value="OLDEST">
                    Oldest First
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <div className="grid min-w-[1650px] grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <div>Date Traded</div>
                  <div>Type</div>
                  <div>Shares</div>
                  <div>Avg Price</div>
                  <div>Notional</div>
                  <div>Position Before</div>
                  <div>Position After</div>
                  <div>% Change</div>
                  <div>Entry vs Current</div>
                  <div>Source</div>
                  <div>Reconciliation</div>
                  <div>Note</div>
                </div>

                {displayedRows.length ? (
                  displayedRows.map((row) => (
                    <TradeHistoryTableRow
                      key={row.trade.id}
                      row={row}
                    />
                  ))
                ) : (
                  <div className="px-6 py-10 text-center text-sm text-slate-500">
                    No trades matched the selected
                    filter.
                  </div>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Entry vs Current compares entry
              execution price with the current
              market price. Exit trades display an
              em dash because realized performance
              requires an authoritative lot-matching
              methodology.
            </p>
          </section>
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
