import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
}: {
  title: string;
  tone: "green" | "red";
  positions: any[];
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
              className="grid min-w-[1180px] grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-xs transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-1 font-semibold text-slate-950">
                {position.security.ticker}
                {openFlag ? (
                  <span className="text-amber-500" title={openFlag.flagType}>
                    ⚑
                  </span>
                ) : null}
              </div>

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
                  ? `${position.dayPctChange >= 0 ? "+" : ""}${position.dayPctChange}%`
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
                  ? `${position.totalPctChange >= 0 ? "+" : ""}${position.totalPctChange}%`
                  : "—"}
              </div>

              <div>
                <button className="rounded-xl bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200">
                  Market Data
                </button>
              </div>

              <div>
                <button className="rounded-xl bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100">
                  {latestComment ? "Comment" : "Add Comment"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const positions = await prisma.position.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      security: {
        include: {
          marketData: {
            take: 1,
            orderBy: {
              updatedAt: "desc",
            },
          },
        },
      },
      comments: {
        where: {
          archivedAt: null,
        },
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
      flags: {
        where: {
          status: "OPEN",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: [
      {
        side: "asc",
      },
      {
        marketValue: "desc",
      },
    ],
  });

  const longPositions = positions.filter((position) => position.side === "LONG");
  const shortPositions = positions.filter((position) => position.side === "SHORT");

  const totalMarketValue = positions.reduce(
    (sum, position) => sum + (position.marketValue ?? 0),
    0
  );

  const weightedPnlProxy = positions.reduce(
    (sum, position) =>
      sum + ((position.marketValue ?? 0) * (position.totalPctChange ?? 0)) / 100,
    0
  );

  const dayPnl = positions.reduce(
    (sum, position) =>
      sum + ((position.marketValue ?? 0) * (position.dayPctChange ?? 0)) / 100,
    0
  );

  const commentedItems = positions.filter(
    (position) => position.comments.length > 0
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
          <div className="mb-6 flex items-center gap-3 px-2 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
              ⌘
            </div>
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
            <div className="rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm">
              Home / Positions
            </div>
            <div className="rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
              Watchlist
            </div>
            <div className="rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
              Past Positions
            </div>
            <div className="rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
              Comments
            </div>
            <div className="rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
              Alerts
            </div>
            <div className="rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
              Settings
            </div>
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
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                Live data mock
              </span>
              <div className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                Joseph Moore
              </div>
            </div>
          </header>

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
                  label="Total Market Value"
                  value={formatMoney(totalMarketValue)}
                  sub={`${positions.length} active positions`}
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
                  "Winners",
                  "Losers",
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
              />

              <PositionGrid
                title="Short Positions"
                tone="red"
                positions={shortPositions}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}