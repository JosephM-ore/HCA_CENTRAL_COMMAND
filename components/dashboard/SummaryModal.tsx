"use client";

import { useState } from "react";

function formatMoney(value: number) {
  return value.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }
  );
}

type SummaryModalProps = {
  open: boolean;
  onClose: () => void;
  positions: any[];
};

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function RankingCard({
  title,
  positions,
}: {
  title: string;
  positions: any[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 font-semibold">
        {title}
      </div>

      <div>
        {positions.map(position => (
          <div
            key={position.id}
            className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-sm last:border-b-0"
          >
            <span>
              {
                position.security
                  .ticker
              }
            </span>

           <span>
            {formatMoney(
                Number(
                position.marketValue ||
                position.unrealizedPnl ||
                0
                )
            )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SummaryModal({
  open,
  onClose,
  positions,
}: SummaryModalProps)
 {
  const [activeTab, setActiveTab] =
    useState("EXECUTIVE");

    const grossInvestments =
  positions.reduce(
    (sum, position) =>
      sum +
      Math.abs(
        Number(
          position.marketValue || 0
        )
      ),
    0
  );

const netInvestments =
  positions.reduce(
    (sum, position) =>
      sum +
      Number(
        position.marketValue || 0
      ),
    0
  );

const totalUnrealizedPnl =
  positions.reduce(
    (sum, position) =>
      sum +
      Number(
        position.unrealizedPnl || 0
      ),
    0
  );

const dayPnl =
  positions.reduce(
    (sum, position) =>
      sum +
      ((Number(
        position.marketValue || 0
      ) *
        Number(
          position.dayPctChange || 0
        )) /
        100),
    0
  );

const topWinners = [...positions]
  .sort(
    (a, b) =>
      Number(
        b.unrealizedPnl || 0
      ) -
      Number(
        a.unrealizedPnl || 0
      )
  )
  .slice(0, 10);

const topLosers = [...positions]
  .sort(
    (a, b) =>
      Number(
        a.unrealizedPnl || 0
      ) -
      Number(
        b.unrealizedPnl || 0
      )
  )
  .slice(0, 10);

const bestLongsToday =
  positions
    .filter(
      p => p.side === "LONG"
    )
    .sort(
      (a, b) =>
        Number(
          b.dayPctChange || 0
        ) -
        Number(
          a.dayPctChange || 0
        )
    )
    .slice(0, 10);

const worstShortsToday =
  positions
    .filter(
      p => p.side === "SHORT"
    )
    .sort(
      (a, b) =>
        Number(
          a.dayPctChange || 0
        ) -
        Number(
          b.dayPctChange || 0
        )
    )
    .slice(0, 10);
const longPositions =
  positions.filter(
    p => p.side === "LONG"
  );

const shortPositions =
  positions.filter(
    p => p.side === "SHORT"
  );

const totalLongExposure =
  longPositions.reduce(
    (sum, position) =>
      sum +
      Number(
        position.marketValue || 0
      ),
    0
  );

const totalShortExposure =
  shortPositions.reduce(
    (sum, position) =>
      sum +
      Math.abs(
        Number(
          position.marketValue || 0
        )
      ),
    0
  );

const grossExposure =
  totalLongExposure +
  totalShortExposure;

const sectorExposure = Object.entries(
  positions.reduce(
    (
      accumulator,
      position
    ) => {
      const sector =
        position.security?.sector ||
        "Unclassified";

      accumulator[sector] =
        (accumulator[
          sector
        ] || 0) +
        Math.abs(
          Number(
            position.marketValue || 0
          )
        );

      return accumulator;
    },
    {} as Record<
      string,
      number
    >
  )
)
  .sort(
    (a, b) =>
      Number(b[1]) -
      Number(a[1])
  )
  .slice(0, 15);

const largestLongs =
  [...longPositions]
    .sort(
      (a, b) =>
        Number(
          b.marketValue || 0
        ) -
        Number(
          a.marketValue || 0
        )
    )
    .slice(0, 15);

const largestShorts =
  [...shortPositions]
    .sort(
      (a, b) =>
        Math.abs(
          Number(
            b.marketValue || 0
          )
        ) -
        Math.abs(
          Number(
            a.marketValue || 0
          )
        )
    )
    .slice(0, 15);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Fund Summaries
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Executive dashboard and portfolio analytics.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3">
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
            <div className="space-y-5">

        <div className="grid grid-cols-4 gap-4">
            <SummaryCard
            label="Gross Investments"
            value={formatMoney(
                grossInvestments
            )}
            />

            <SummaryCard
            label="Net Investments"
            value={formatMoney(
                netInvestments
            )}
            />

            <SummaryCard
            label="Unrealized P&L"
            value={formatMoney(
                totalUnrealizedPnl
            )}
            />

            <SummaryCard
            label="Day P&L"
            value={formatMoney(
                dayPnl
            )}
            />
        </div>

        <div className="grid grid-cols-2 gap-5">

            <RankingCard
            title="Top Winners"
            positions={topWinners}
            />

            <RankingCard
            title="Top Losers"
            positions={topLosers}
            />

            <RankingCard
            title="Best Longs Today"
            positions={bestLongsToday}
            />

            <RankingCard
            title="Worst Shorts Today"
            positions={worstShortsToday}
            />

        </div>

        </div>
          ) : (
            <div className="space-y-5">

                <div className="grid grid-cols-4 gap-4">

                    <SummaryCard
                    label="Long Exposure"
                    value={formatMoney(
                        totalLongExposure
                    )}
                    />

                    <SummaryCard
                    label="Short Exposure"
                    value={formatMoney(
                        totalShortExposure
                    )}
                    />

                    <SummaryCard
                    label="Gross Exposure"
                    value={formatMoney(
                        grossExposure
                    )}
                    />

                    <SummaryCard
                    label="Net Exposure"
                    value={formatMoney(
                        totalLongExposure -
                        totalShortExposure
                    )}
                    />

                </div>

                <div className="grid grid-cols-3 gap-5">

                    <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3 font-semibold">
                        Sector Exposure
                    </div>

                    <div>
                        {sectorExposure.map(
                        ([sector, value]) => (
                            <div
                            key={sector}
                            className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-sm"
                            >
                            <span>{sector}</span>

                            <span>
                                {(
                                (Number(
                                    value
                                ) /
                                    grossExposure) *
                                100
                                ).toFixed(1)}
                                %
                            </span>
                            </div>
                        )
                        )}
                    </div>
                    </div>

                    <RankingCard
                    title="Largest Longs"
                    positions={
                        largestLongs
                    }
                    />

                    <RankingCard
                    title="Largest Shorts"
                    positions={
                        largestShorts
                    }
                    />

                </div>

                </div>
          )}
        </div>
      </div>
    </div>
  );
}