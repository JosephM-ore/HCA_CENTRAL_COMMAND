"use client";

import Badge from "@/components/common/Badge";
import CurrentUserPill from "@/components/auth/CurrentUserPill";
import HcaLogo from "@/components/common/HcaLogo";
import TradeCalculatorWorkspace from "@/components/trade-calculator/TradeCalculatorWorkspace";


type TradeCalculatorClientProps = {
  initialSecurities: any[];
  grossPortfolioMarketValue: number;
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

export default function TradeCalculatorClient({
  initialSecurities,
  grossPortfolioMarketValue,
}: TradeCalculatorClientProps) {
  const activePositionCount =
    initialSecurities.reduce(
      (total, security) =>
        total +
        (Array.isArray(security.positions)
          ? security.positions.length
          : 0),
      0
    );

  const securitiesWithPositions =
    initialSecurities.filter(
      (security) =>
        Array.isArray(security.positions) &&
        security.positions.length > 0
    ).length;

  const pendingManualTradeCount =
    initialSecurities.reduce(
      (securityTotal, security) => {
        const positions = Array.isArray(
          security.positions
        )
          ? security.positions
          : [];

        return (
          securityTotal +
          positions.reduce(
            (
              positionTotal: number,
              position: any
            ) =>
              positionTotal +
              (Array.isArray(position.trades)
                ? position.trades.length
                : 0),
            0
          )
        );
      },
      0
    );

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

          <div className="rounded-3xl bg-slate-900 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Current Workspace
            </p>

            <p className="mt-2 text-lg font-semibold">
              Trade Calculator
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-300">
              Model a possible trade and review its
              projected portfolio impact before
              creating a manual trade.
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">
              Wells Remains Authoritative
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Scenario calculations do not modify
              Wells position, WAP, market value,
              portfolio weight, or P&amp;L records.
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm font-medium text-violet-900">
              Pending Trade Awareness
            </p>

            <p className="mt-2 text-xs leading-5 text-violet-700">
              The calculator can include unreconciled
              manual trades when building an
              operational baseline.
            </p>
          </div>

          <div className="mt-auto rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">
              Calculation Mode
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              No records are created until an
              authorized user reviews and explicitly
              adds a manual trade.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Trade Calculator
              </p>

              <p className="text-xs text-slate-500">
                Potential trade analysis
              </p>
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="blue">
                Calculation only
              </Badge>

              <CurrentUserPill />
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-auto p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Potential Trade Calculator
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Model position sizing, portfolio
                  impact, and risk without changing
                  HCA records.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Securities
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {initialSecurities.length}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Available for calculation
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Active Positions
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {activePositionCount}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Across{" "}
                    {securitiesWithPositions}{" "}
                    Securities
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pending Manual Trades
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-violet-700">
                    {pendingManualTradeCount}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Available for baseline projection
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gross Portfolio
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {formatMoney(
                      grossPortfolioMarketValue
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Absolute Wells market value
                  </p>
                </div>
            </div>

                <TradeCalculatorWorkspace
                securities={initialSecurities}
                grossPortfolioMarketValue={
                  grossPortfolioMarketValue
                }
              />

            </div>
          </div>
        </section>
      </div>
    </main>
  );
}