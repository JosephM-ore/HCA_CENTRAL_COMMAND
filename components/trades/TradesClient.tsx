"use client";

import AppSidebar from "@/components/common/AppSidebar";
import CurrentUserPill from "@/components/auth/CurrentUserPill";
import { useMemo } from "react";

type TradesClientProps = {
  positions: any[];
};

export default function TradesClient({
  positions,
}: TradesClientProps) {

    function formatMoney(value: number) {
    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });
    }

    function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date));
    }
  const allTrades = useMemo(() => {
    return positions.flatMap((position) =>
      (position.trades || []).map((trade: any) => ({
        ...trade,
        ticker: position.security.ticker,
        company: position.security.name,
        side: position.side,
      }))
    );
  }, [positions]);


    const groupedTrades = useMemo(() => {
    const groups = new Map<string, any[]>();

    [...allTrades]
        .sort(
        (a, b) =>
            new Date(b.dateTraded).getTime() -
            new Date(a.dateTraded).getTime()
        )
        .forEach((trade) => {
        const dateKey = new Date(trade.dateTraded)
            .toISOString()
            .slice(0, 10);

        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }

        groups.get(dateKey)!.push(trade);
        });

    return Array.from(groups.entries());
    }, [allTrades]);
  console.log(
    "Positions:",
    positions.length
    );

    console.log(
    "Trades:",
    allTrades?.length
    );


  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full">
        <AppSidebar activePage="/trades" />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Trades
              </p>

              <p className="text-xs text-slate-500">
                Global trade history
              </p>
            </div>

            <CurrentUserPill />
          </header>

          <div className="overflow-auto p-6">
            <div className="mb-6">
                <h2 className="text-3xl font-semibold">
                Trades
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                Global trade history grouped by trading day.
                </p>
            </div>

            <div className="space-y-6">
                {groupedTrades.map(([date, trades]) => {
                const grossNotional = trades.reduce(
                    (sum, trade) =>
                    sum +
                    Math.abs(
                        Number(trade.shares || 0) *
                        Number(trade.avgPrice || 0)
                    ),
                    0
                );

                return (
                    <div
                    key={date}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-950">
                            {formatDate(date)}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                            {trades.length} trades
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                            Gross Notional
                            </p>

                            <p className="font-semibold text-slate-950">
                            {formatMoney(grossNotional)}
                            </p>
                        </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="grid min-w-[1200px] grid-cols-8 border-b bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <div>Ticker</div>
                        <div>Date Traded</div>
                        <div>Type</div>
                        <div>Shares</div>
                        <div>Avg Price</div>
                        <div>Notional</div>
                        <div>Source</div>
                        <div>Note</div>
                        </div>

                        {trades.map((trade) => (
                        <div
                            key={trade.id}
                            className="grid min-w-[1200px] grid-cols-8 items-center border-b border-slate-100 px-4 py-3 text-xs last:border-b-0 hover:bg-slate-50"
                        >
                            <div className="font-semibold text-slate-950">
                            {trade.ticker}
                            </div>

                            <div className="text-slate-600">
                            {new Date(
                                trade.dateTraded
                            ).toLocaleString()}
                            </div>

                            <div>{trade.tradeType}</div>

                            <div>
                            {Number(
                                trade.shares || 0
                            ).toLocaleString()}
                            </div>

                            <div>
                            {formatMoney(
                                Number(trade.avgPrice || 0)
                            )}
                            </div>

                            <div>
                            {formatMoney(
                                Number(trade.shares || 0) *
                                Number(trade.avgPrice || 0)
                            )}
                            </div>

                            <div>
                            {trade.source || "—"}
                            </div>

                            <div
                            className="truncate text-slate-500"
                            title={trade.comment || ""}
                            >
                            {trade.comment || "—"}
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>
                );
                })}
            </div>
            </div>
        </section>
      </div>
    </main>
  );
}
