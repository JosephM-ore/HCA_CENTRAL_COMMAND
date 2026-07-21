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
    const navItems = [
        { href: "/", label: "Home / Positions" },
        { href: "/watchlist", label: "Watchlist" },
        { href: "/past-positions", label: "Past Positions" },
        { href: "/comments", label: "Comments" },
        { href: "/alerts", label: "Alerts" },
        { href: "/trade-calculator", label: "Trade Calculator", active: true },
        { href: "/settings", label: "Settings" },
    ];
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