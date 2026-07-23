"use client";
import {
  getDisplayCurrentPrice,
  getDisplayDayPctChange,
} from "@/lib/dashboard/position-metrics";
import { useMemo, useState } from "react";

type SummaryModalProps = {
  open: boolean;
  onClose: () => void;
  positions: any[];
};

function formatMoney(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPrice(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getPerformanceClass(
  value: number | null | undefined
) {
  const numericValue = Number(value ?? 0);

  if (numericValue > 0) {
    return "font-semibold text-emerald-600";
  }

  if (numericValue < 0) {
    return "font-semibold text-rose-600";
  }

  return "font-semibold text-slate-600";
}

function getDayPnl(position: any) {
  const marketValue = Number(
    position.marketValue || 0
  );

  const dayPctChange =
  getDisplayDayPctChange(position) || 0;

  return (
    (marketValue * dayPctChange) /
    100
  );
}

function ReportTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-3"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SummaryModal({
  open,
  onClose,
  positions,
}: SummaryModalProps) {
  const [activeTab, setActiveTab] =
    useState("EXECUTIVE");

  const analytics = useMemo(() => {
    const positionsWithDayPnl =
      positions.map((position) => ({
        ...position,
        calculatedDayPnl:
          getDayPnl(position),
      }));

    const profitRankings =
      [...positionsWithDayPnl]
        .sort(
          (a, b) =>
            b.calculatedDayPnl -
            a.calculatedDayPnl
        )
        .slice(0, 10);

    const lossRankings =
      [...positionsWithDayPnl]
        .sort(
          (a, b) =>
            a.calculatedDayPnl -
            b.calculatedDayPnl
        )
        .slice(0, 10);

    const longPositions =
      positionsWithDayPnl.filter(
        (position) =>
          position.side === "LONG"
      );

    const shortPositions =
      positionsWithDayPnl.filter(
        (position) =>
          position.side === "SHORT"
      );

    const sectorExposure =
      Object.entries(
        positions.reduce(
          (
            accumulator,
            position
          ) => {
            const sector =
              position.security
                ?.sector ||
              "Unclassified";

            const exposure =
              Math.abs(
                Number(
                  position.marketValue ||
                    0
                )
              );

            accumulator[sector] =
              (accumulator[
                sector
              ] || 0) + exposure;

            return accumulator;
          },
          {} as Record<
            string,
            number
          >
        )
      ).sort(
        (a, b) =>
          Number(b[1]) -
          Number(a[1])
      );

    const totalExposure =
      sectorExposure.reduce(
        (
          sum,
          [, exposure]
        ) =>
          sum +
          Number(exposure),
        0
      );

    return {
      profitRankings,
      lossRankings,
      longPositions,
      shortPositions,
      sectorExposure,
      totalExposure,
    };
  }, [positions]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-[1700px] flex-col overflow-hidden rounded-3xl bg-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Fund Report Center
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Executive summary and
              portfolio reporting.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex gap-2">
            <button
              onClick={() =>
                setActiveTab(
                  "EXECUTIVE"
                )
              }
              className={`rounded-xl px-4 py-2 text-sm ${
                activeTab ===
                "EXECUTIVE"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Executive Summary
            </button>

            <button
              onClick={() =>
                setActiveTab(
                  "REPORT"
                )
              }
              className={`rounded-xl px-4 py-2 text-sm ${
                activeTab ===
                "REPORT"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Fund Report
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab ===
          "EXECUTIVE" ? (
            <div className="space-y-6">

              <ReportTable
                title="Top 10 Profit Rankings"
                columns={[
                  "Ticker",
                  "Side",
                  "Quantity",
                  "Day P&L",
                ]}
                rows={analytics.profitRankings.map(
                  (
                    position
                  ) => [
                    position
                      .security
                      ?.ticker,
                    position.side,
                    formatNumber(
                      position.shares
                    ),
                    <span className="font-semibold text-emerald-600">
                      {formatMoney(
                        position.calculatedDayPnl
                      )}
                    </span>,
                  ]
                )}
              />

              <ReportTable
                title="Top 10 Loss Rankings"
                columns={[
                  "Ticker",
                  "Side",
                  "Quantity",
                  "Day P&L",
                ]}
                rows={analytics.lossRankings.map(
                  (
                    position
                  ) => [
                    position
                      .security
                      ?.ticker,
                    position.side,
                    formatNumber(
                      position.shares
                    ),
                    <span className="font-semibold text-rose-600">
                      {formatMoney(
                        position.calculatedDayPnl
                      )}
                    </span>,
                  ]
                )}
              />

              <ReportTable
                title="Long Positions Day Change"
                columns={[
                    "Ticker",
                    "Quantity",
                    "Last Price",
                    "Market Value",
                    "Net ($)",
                    "Change %",
                ]}
                rows={analytics.longPositions.map(
                    (position) => [
                    position.security?.ticker,
                    formatNumber(position.shares),
                    formatPrice(
                        getDisplayCurrentPrice(position)
                    ),
                    formatMoney(
                        position.marketValue
                    ),
                    <span
                        className={getPerformanceClass(
                            position.calculatedDayPnl
                        )}
                        >
                        {formatMoney(
                            position.calculatedDayPnl
                        )}
                        </span>,
                        <span
                        className={getPerformanceClass(
                            getDisplayDayPctChange(position)
                        )}
                        >
                        {formatPercent(
                            getDisplayDayPctChange(position)
                        )}
                        </span>,
                    ]
                )}
                />

             <ReportTable
                title="Short Positions Day Change"
                columns={[
                    "Ticker",
                    "Quantity",
                    "Last Price",
                    "Market Value",
                    "Net ($)",
                    "Change %",
                ]}
                rows={analytics.shortPositions.map(
                    (position) => [
                    position.security?.ticker,
                    formatNumber(position.shares),
                    formatPrice(
                        getDisplayCurrentPrice(position)
                    ),
                    formatMoney(
                        position.marketValue
                    ),
                    <span
                        className={getPerformanceClass(
                            position.calculatedDayPnl
                        )}
                        >
                        {formatMoney(
                            position.calculatedDayPnl
                        )}
                        </span>,
                        <span
                        className={getPerformanceClass(
                            getDisplayDayPctChange(position)
                        )}
                        >
                        {formatPercent(
                            getDisplayDayPctChange(position)
                        )}
                        </span>,
                    ]
                )}
                />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="font-semibold text-slate-900">
                  Position Sizes By Category
                </h3>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {analytics.sectorExposure.map(
                    ([
                      sector,
                      exposure,
                    ]) => {
                      const pct =
                        (Number(
                          exposure
                        ) /
                          Math.max(
                            analytics.totalExposure,
                            1
                          )) *
                        100;

                      return (
                        <div
                          key={sector}
                        >
                          <div className="mb-1 flex items-center justify-between text-sm font-medium">
                            <span>
                              {sector}
                            </span>

                            <span>
                              {pct.toFixed(
                                2
                              )}
                              %
                            </span>
                          </div>

                          <div className="h-3 rounded-full bg-slate-100">
                            <div
                              className="h-3 rounded-full bg-blue-600"
                              style={{
                                width: `${pct}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}