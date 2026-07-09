"use client";
import LocalDateTime from "@/components/common/LocalDateTime";
import { useEffect, useMemo, useState } from "react";
import CurrentUserPill from "@/components/auth/CurrentUserPill";

import {
  canCreateComments,
  canCreateFlags,
} from "@/lib/client-permissions";

import {
  getDashboardStats,
  getDisplayCostBasis,
  getDisplayCurrentPrice,
  getDisplayMarketValue,
  getDisplayPortfolioPct,
  getDisplayTotalPctChange,
  getDisplayUnrealizedPnl,
  getDisplayWap,
  getDisplayDayPctChange,
} from "@/lib/dashboard/position-metrics";


type DashboardClientProps = {
  positions: any[];
};




function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
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



function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}







function pnlClass(value: number | null | undefined) {
  if (value == null) return "text-slate-500";
  return value >= 0 ? "text-emerald-600" : "text-rose-600";
}


function DateDisplay({
  value,
  className,
}: {
  value: string | Date | null | undefined;
  className?: string;
}) {
  if (!value) return <span className={className}>—</span>;

  return <LocalDateTime value={value} className={className} />;
}


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
  portfolioPositions,
  selectedId,
  onSelect,
  onMarketData,
  onComment,
  canComment,
}: {
  title: string;
  tone: "green" | "red";
  positions: any[];
  portfolioPositions: any[];
  selectedId?: string;
  onSelect: (position: any) => void;
  onMarketData: (position: any) => void;
  onComment: (position: any) => void;
  canComment: boolean;
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

          const latestComment = position.comments?.[0];
          const openFlag = position.flags?.[0];
          const currentPrice = getDisplayCurrentPrice(position);
          const wap = getDisplayWap(position);
          const totalPctChange = getDisplayTotalPctChange(position);
          const portfolioPct = getDisplayPortfolioPct(position, portfolioPositions);
          const dayPctChange = getDisplayDayPctChange(position);
          

          return (
            <div
              key={position.id}
              className={`grid min-w-[1180px] grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-xs transition hover:bg-slate-50 ${
                selectedId === position.id ? "bg-slate-100" : "bg-white"
              }`}
            >
              <button
                onClick={() => onSelect(position)}
                className="flex items-center gap-1 text-left font-semibold text-slate-950 hover:underline"
              >
                {position.security.ticker}
                {openFlag ? (
                  <span className="text-amber-500" title={openFlag.flagType}>
                    ⚑
                  </span>
                ) : null}
              </button>

              <div className="col-span-2 truncate text-slate-600">
                {position.security.name}
              </div>

              
              <div className="font-medium">
                {formatPrice(currentPrice)}
              </div>


                            
              <div className={`font-semibold ${pnlClass(dayPctChange)}`}>
                {formatPercent(dayPctChange)}
              </div>


              <div>{formatMoney(position.marketValue)}</div>

              
              <div>
                {portfolioPct != null ? `${portfolioPct.toFixed(2)}%` : "—"}
              </div>


              <div>{formatNumber(position.shares)}</div>

              <div>{formatPrice(wap)}</div>

              
              <div className={`font-semibold ${pnlClass(totalPctChange)}`}>
                {formatPercent(totalPctChange)}
              </div>


              <div>              
                <button
                  onClick={() => openCapitalIq(position.security.ticker)}
                  className="rounded-xl bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200"
                >
                  Capital IQ
                </button>
              </div>

              <div>
                {canComment ? (
                  <button
                    onClick={() => onComment(position)}
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

function TickerDetailPanel({
  position,
  onClose,
  onComment,
  onMarketData,
  onFlag,
  onLots,
  onAddTrade,
  canComment,
  canFlag,
}: {
  position: any | null;
  onClose: () => void;
  onComment: (position: any) => void;
  onMarketData: (position: any) => void;
  onFlag: (position: any) => void;
  onLots: (position: any) => void;
  onAddTrade: (position: any) => void;
  canComment: boolean;
  canFlag: boolean;
}) {
  const [showAllTrades, setShowAllTrades] = useState(false);

    useEffect(() => {
    setShowAllTrades(false);
  }, [position?.id]);

  if (!position) return null;

  const security = position.security;
  const openFlag = position.flags?.[0];

  const latestComment = position.comments?.find(
    (comment: any) => comment.tag !== "PT"
  );

  const currentPrice = getDisplayCurrentPrice(position);
  const wap = getDisplayWap(position);
  const totalPctChange = getDisplayTotalPctChange(position);
 

  const visibleTrades = showAllTrades
    ? position.trades || []
    : (position.trades || []).slice(0, 5);

  const hiddenTradeCount = Math.max((position.trades?.length || 0) - 5, 0);


  return (
    <aside className="flex h-full w-[560px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-950">
                {security.ticker}
              </h2>

              <Badge tone={position.side === "SHORT" ? "red" : "green"}>
                {position.side}
              </Badge>

              {openFlag ? <Badge tone="amber">{openFlag.flagType}</Badge> : null}
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {security.name} • Clicked ticker detail
            </p>
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
              {formatPrice(currentPrice)}
            </p>

          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">WAP / Point</p>                      
            <p className="mt-1 font-semibold text-slate-950">
              {formatPrice(wap)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Shares</p>
            <p className="mt-1 font-semibold text-slate-950">
              {formatNumber(position.shares)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total % Change</p>           
            <p className={`mt-1 font-semibold ${pnlClass(totalPctChange)}`}>
              {formatPercent(totalPctChange)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canComment ? (
            <button
              onClick={() => onComment(position)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Comment
            </button>
          ) : (
            <button
              disabled
              className="cursor-not-allowed rounded-2xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
            >
              Read Only
            </button>
          )}
          {canFlag ? (
            <button
              onClick={() => onFlag(position)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Flag
            </button>
          ) : (
            <button
              disabled
              className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
            >
              Flag
            </button>
          )}     
          
          <button
            onClick={() => openCapitalIq(position.security.ticker)}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Capital IQ
          </button>

          
          <button
            onClick={() => onLots(position)}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Lots
          </button>

          <button
            onClick={() => onAddTrade(position)}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Add Trade
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">
              Trade History From Ticker Click
            </h3>

            <span className="text-xs text-slate-400">
              {visibleTrades.length} of {position.trades?.length || 0} trades
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 text-xs">
            <div className="grid grid-cols-6 gap-2 bg-slate-50 px-3 py-3 font-semibold uppercase tracking-wide text-slate-500">
              <span>Date Traded</span>
              <span>Type</span>
              <span>Shares</span>
              <span>Avg Price</span>
              <span>Source</span>
              <span>Note</span>
            </div>

            
            {visibleTrades.length ? (
              visibleTrades.map((trade: any) => (

                <div
                  key={trade.id}
                  className="grid grid-cols-6 items-center gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0"
                >
                  <DateDisplay value={trade.dateTraded} />

                  <span>{trade.tradeType || "—"}</span>

                  <span>{formatNumber(trade.shares)}</span>

                  <span>{formatPrice(trade.avgPrice)}</span>

                  <span className="flex flex-col items-start gap-1">
                    {trade.source === "MANUAL" ? (
                      <Badge tone="amber">Manual</Badge>
                    ) : trade.source === "WELLS_FARGO" ? (
                      <Badge tone="green">Wells</Badge>
                    ) : (
                      <Badge tone="slate">{trade.source || "Unknown"}</Badge>
                    )}

                    {trade.reconciliationStatus === "REVIEW_REQUIRED" ? (
                      <Badge tone="red">Review</Badge>
                    ) : trade.reconciliationStatus === "MANUAL_PENDING" ? (
                      <Badge tone="amber">Pending</Badge>
                    ) : trade.reconciliationStatus === "MATCHED" ? (
                      <Badge tone="blue">Matched</Badge>
                    ) : null}
                  </span>

                  <span
                    title={trade.comment || ""}
                    className="truncate text-slate-500"
                  >
                    {trade.comment || "—"}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-slate-500">
                No trade history yet.
              </div>
            )}
            {hiddenTradeCount > 0 ? (
              <button
                onClick={() => setShowAllTrades((current) => !current)}
                className="w-full border-t border-slate-100 px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {showAllTrades
                  ? "Show fewer trades"
                  : `Show all trades (${hiddenTradeCount} more)`}
              </button>
            ) : null}
          </div>
        </section>

        

        <section className="mt-5">
          <h3 className="mb-3 font-semibold text-slate-950">Comment Timeline</h3>

          <div className="space-y-3">
            {position.comments?.length ? (
              position.comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge tone="blue">{comment.tag}</Badge>
                    <LocalDateTime
                      value={comment.createdAt}
                      className="text-xs text-slate-400"
                    />
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
      </div>
    </aside>
  );
}

function TaxLotsModal({
  position,
  onClose,
}: {
  position: any | null;
  onClose: () => void;
}) {
  if (!position) return null;

  const security = position.security;
  const lots = position.taxLots || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-6xl flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Tax Lot Breakdown
            </h2>
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

        <div className="overflow-auto p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 text-xs">
            <div className="grid min-w-[1050px] grid-cols-10 gap-2 bg-slate-50 px-3 py-3 font-semibold uppercase tracking-wide text-slate-500">
              <span>Lot Date</span>
              <span>Tax Lot ID</span>
              <span>Qty</span>
              <span>Unit Cost</span>
              <span>Mkt Price</span>
              <span>Cost</span>
              <span>Mkt Value</span>
              <span>U/P&L</span>
              <span>ROI</span>
              <span>Days to LT</span>
            </div>

            {lots.length ? (
              lots.map((lot: any) => (
                <div
                  key={lot.id}
                  className="grid min-w-[1050px] grid-cols-10 gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0"
                >
                  <DateDisplay value={lot.taxLotDate} />
                  <span className="truncate text-slate-500">
                    {lot.taxLotId || "—"}
                  </span>
                  <span>{formatNumber(lot.quantity)}</span>
                  <span>{formatPrice(lot.unitCost)}</span>
                  <span>{formatPrice(lot.marketPrice)}</span>
                  <span>{formatMoney(lot.costBasis)}</span>
                  <span>{formatMoney(lot.marketValue)}</span>
                  <span className={pnlClass(lot.unrealizedPnl)}>
                    {formatMoney(lot.unrealizedPnl)}
                  </span>
                  <span className={pnlClass(lot.roi)}>
                    {lot.roi != null ? `${lot.roi.toFixed(1)}%` : "—"}
                  </span>
                  <span>{lot.daysToLongTerm || "—"}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-slate-500">
                No tax lot breakdown yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketDataModal({
  position,
  onClose,
}: {
  position: any | null;
  onClose: () => void;
}) {

  if (!position) return null;

  const security = position.security;
  const marketData = security.marketData?.[0];
 


  const rows = [

    ["VWAP", marketData?.vwap != null ? `$${marketData.vwap.toFixed(2)}` : "N/A"],
    [
      "52 Week High",
      marketData?.high52w != null ? `$${marketData.high52w.toFixed(2)}` : "N/A",
    ],
    [
      "52 Week Low",
      marketData?.low52w != null ? `$${marketData.low52w.toFixed(2)}` : "N/A",
    ],
    ["Beta", marketData?.beta != null ? marketData.beta.toFixed(2) : "N/A"],
    [
      "Avg Volume",
      marketData?.avgVolume != null
        ? marketData.avgVolume.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })
        : "N/A",
    ],
    [
      "Short Float",
      marketData?.shortFloat != null ? `${marketData.shortFloat}%` : "N/A",
    ],
    [
      "Market Cap",
      marketData?.marketCap != null ? formatMoney(marketData.marketCap) : "N/A",
    ],
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
            <h2 className="text-xl font-semibold text-slate-950">
              Market Data
            </h2>
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
              {marketData?.lastMarketDataRefreshAt ? (
                <LocalDateTime value={marketData.lastMarketDataRefreshAt} />
              ) : (
                "N/A"
              )}
            </span>
            <span className="font-medium text-slate-700">Last Fundamentals Refresh</span>
            <span className="text-right font-semibold text-slate-950">
              {marketData?.lastFundamentalsRefreshAt ? (
                <LocalDateTime value={marketData.lastFundamentalsRefreshAt} />
              ) : (
                "N/A"
              )}
            </span>

          </div>
        </div>
      </div>
    </div>
  );
}

function AddTradeModal({
  position,
  onClose,
  onSave,
}: {
  position: any | null;
  onClose: () => void;
  onSave: (payload: {
    securityId: string;
    positionId: string;
    tradeType: string;
    dateTraded: string;
    shares: string;
    avgPrice: string;
    comment: string;
  }) => Promise<void>;
}) {
  const [tradeType, setTradeType] = useState("BUY");
  const [dateTraded, setDateTraded] = useState("");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!position) return;

    const today = new Date().toISOString().slice(0, 10);
    setDateTraded(today);
    setTradeType(position.side === "SHORT" ? "SHORT" : "BUY");
    setShares("");
    setAvgPrice("");
    setComment("");
    setError("");
  }, [position]);

  if (!position) return null;

  const estimatedNotional =
    Number.isFinite(Number(shares)) && Number.isFinite(Number(avgPrice))
      ? Number(shares) * Number(avgPrice)
      : null;

  async function handleSave() {
    setError("");

    if (!shares.trim()) {
      setError("Shares are required.");
      return;
    }

    if (!avgPrice.trim()) {
      setError("Average price is required.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        securityId: position.securityId,
        positionId: position.id,
        tradeType,
        dateTraded,
        shares,
        avgPrice,
        comment,
      });

      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to add manual trade."
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
              Add Manual Trade
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {position.security.ticker} • {position.security.name}
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
            value={tradeType}
            onChange={(event) => setTradeType(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
            <option value="SHORT">Sell Short</option>
            <option value="COVER">Cover Short</option>
          </select>

          <input
            type="date"
            value={dateTraded}
            onChange={(event) => setDateTraded(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
          />

          <input
            value={shares}
            onChange={(event) => setShares(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Shares"
          />

          <input
            value={avgPrice}
            onChange={(event) => setAvgPrice(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Average price"
          />

          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            Estimated notional:{" "}
            <span className="font-semibold text-slate-950">
              {estimatedNotional != null ? formatMoney(estimatedNotional) : "—"}
            </span>
          </div>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="h-28 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Optional trade note..."
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
            {isSaving ? "Saving..." : "Add Trade"}
          </button>
        </div>
      </div>
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
  const [tag, setTag] = useState("COMMENT");
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
      setTag("COMMENT");
      onClose();
    } catch (error) {
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
              {position.security.ticker} • timestamp and author are captured
              automatically
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
          {latestComment?.content || "No comment yet."}
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a comment, position note, trade rationale, market data observation, catalyst update, or exit rationale..."
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

function FlagModal({
  position,
  onClose,
  onSave,
}: {
  position: any | null;
  onClose: () => void;
  onSave: (payload: {
    securityId: string;
    positionId: string;
    flagType: string;
    priority: string;
    description: string;
  }) => Promise<void>;
}) {
  const [flagType, setFlagType] = useState("Risk Review");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!position) return null;

  const flagTypes = [
    "Risk Review",
    "Earnings Upcoming",
    "Valuation Stretched",
    "Thesis Changed",
    "Candidate",
    "Under Review",
    "Margin Pressure",
    "Credit Watch",
    "Quality Risk",
    "Event-driven",
    "Custom",
  ];

  async function handleSave() {
    setError("");

    if (!flagType.trim()) {
      setError("Please select a flag type.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        securityId: position.securityId,
        positionId: position.id,
        flagType,
        priority,
        description,
      });

      setFlagType("Risk Review");
      setPriority("MEDIUM");
      setDescription("");
      onClose();
    } catch {
      setError("Failed to create flag. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Flag Ticker
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {position.security.ticker} • {position.security.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Flag Type
            </label>
            <select
              value={flagType}
              onChange={(event) => setFlagType(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            >
              {flagTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe why this ticker needs attention..."
              className="mt-2 h-28 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
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
            {isSaving ? "Saving..." : "Save Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function DashboardClient({ positions }: DashboardClientProps) {
  const [localPositions, setLocalPositions] = useState<any[]>(positions);

  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);

  const [marketDataPosition, setMarketDataPosition] = useState<any | null>(null);
  const [commentPosition, setCommentPosition] = useState<any | null>(null);
  const [flagPosition, setFlagPosition] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [taxLotsPosition, setTaxLotsPosition] = useState<any | null>(null);
  const [manualTradePosition, setManualTradePosition] = useState<any | null>(null);

  const userCanCreateComments = canCreateComments(currentUser?.role);
  const userCanCreateFlags = canCreateFlags(currentUser?.role);

  useEffect(() => {
    async function loadCurrentUser() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) return;

      const data = await response.json();
      setCurrentUser(data.user);
    }

    loadCurrentUser();
  }, []);

  const filteredPositions = useMemo(() => {
  const normalizedQuery = query.trim().toLowerCase();

  return localPositions
    .filter((position) => {
      

          
      const flagText = position.flags?.map((flag: any) => flag.flagType).join(" ") || "";

      const searchable = [
        position.security?.ticker,
        position.security?.name,
        position.security?.sector,
        position.side,
        
        flagText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Long" && position.side === "LONG") ||
        (activeFilter === "Short" && position.side === "SHORT") ||
        (activeFilter === "Winners" &&
          (getDisplayTotalPctChange(position) ?? 0) >= 0) ||
        (activeFilter === "Losers" &&
          (getDisplayTotalPctChange(position) ?? 0) < 0) ||
        (activeFilter === "Flagged" && position.flags?.length > 0) ||
        position.security?.sector?.toLowerCase().includes(activeFilter.toLowerCase());

      return matchesQuery && matchesFilter;
    })
    
    .sort((a, b) => {
      const aTotalPctChange = getDisplayTotalPctChange(a);
      const bTotalPctChange = getDisplayTotalPctChange(b);

      if (activeFilter === "Winners") {
        return (bTotalPctChange ?? 0) - (aTotalPctChange ?? 0);
      }

      if (activeFilter === "Losers") {
        return (aTotalPctChange ?? 0) - (bTotalPctChange ?? 0);
      }

      return (
        (getDisplayPortfolioPct(b, localPositions) ?? 0) -
        (getDisplayPortfolioPct(a, localPositions) ?? 0)
      );
    });

}, [localPositions, query, activeFilter]);

const longPositions = useMemo(
  () => filteredPositions.filter((position) => position.side === "LONG"),
  [filteredPositions]
);

const shortPositions = useMemo(
  () => filteredPositions.filter((position) => position.side === "SHORT"),
  [filteredPositions]
);

const {
  totalMarketValue,
  netMarketValue,
  totalUnrealizedPnl,
  dayPnl,
} = getDashboardStats(localPositions);

  async function handleSaveManualTrade(payload: {
    securityId: string;
    positionId: string;
    tradeType: string;
    dateTraded: string;
    shares: string;
    avgPrice: string;
    comment: string;
  }) {
    const response = await fetch("/api/trades/manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to add manual trade.");
    }

    const newTrade = data.trade;

    setLocalPositions((currentPositions) =>
      currentPositions.map((position) => {
        if (position.id !== payload.positionId) return position;

        return {
          ...position,
          trades: [newTrade, ...(position.trades || [])],
        };
      })
    );

    setSelectedPosition((currentPosition: any | null) => {
      if (!currentPosition || currentPosition.id !== payload.positionId) {
        return currentPosition;
      }

      return {
        ...currentPosition,
        trades: [newTrade, ...(currentPosition.trades || [])],
      };
    });
  }

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

  setLocalPositions((currentPositions) =>
    currentPositions.map((position) => {
      if (position.id !== payload.positionId) return position;

      return {
        ...position,
        comments: [newComment, ...(position.comments || [])],
      };
    })
  );

  setSelectedPosition((currentPosition: any | null) => {
    if (!currentPosition || currentPosition.id !== payload.positionId) {
      return currentPosition;
    }

    return {
      ...currentPosition,
      comments: [newComment, ...(currentPosition.comments || [])],
    };
  });
}

function handleOpenComment(position: any) {
  setSelectedPosition(position);
  setCommentPosition(position);
}

async function handleSaveFlag(payload: {
  securityId: string;
  positionId: string;
  flagType: string;
  priority: string;
  description: string;
}) {
  const response = await fetch("/api/flags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create flag.");
  }

  const data = await response.json();
  const newFlag = data.flag;

  setLocalPositions((currentPositions) =>
    currentPositions.map((position) => {
      if (position.id !== payload.positionId) return position;

      return {
        ...position,
        flags: [newFlag, ...(position.flags || [])],
      };
    })
  );

  setSelectedPosition((currentPosition: any | null) => {
    if (!currentPosition || currentPosition.id !== payload.positionId) {
      return currentPosition;
    }

    return {
      ...currentPosition,
      flags: [newFlag, ...(currentPosition.flags || [])],
    };
  });
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
            <a
              href="/"
              className="block rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm"
            >
              Home / Positions
            </a>

            <a
              href="/watchlist"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Watchlist
            </a>

            <a
              href="/past-positions"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Past Positions
            </a>

            <a
              href="/comments"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Comments
            </a>
            
            <a
              href="/alerts"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Alerts
            </a>

            <a
              href="/settings"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Settings
            </a>
            
    
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
            <div>
              <p className="text-sm font-medium text-slate-900">Home / Positions</p>
              <p className="text-xs text-slate-500">Active portfolio dashboard</p>
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="green">Wells-derived metrics</Badge>
              <CurrentUserPill />
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
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

                 
                </div>

                <div className="grid grid-cols-4 gap-4">
                  
                  <StatCard
                    label="Gross Investments"
                    value={formatMoney(totalMarketValue)}
                    sub={`${localPositions.length} active positions from Wells`}
                  />
 
                   <StatCard
                    label="Net Portfolio"
                    value={formatMoney(netMarketValue)}
                    sub="Long exposure less short exposure"
                  />

                  
                  <StatCard
                    label="Unrealized P&L"
                    value={formatMoney(totalUnrealizedPnl)}
                    sub="From Wells tax lot data"
                  />

                 <StatCard
                    label="Day P&L"
                    value={formatMoney(dayPnl)}
                    sub="Estimated from Finnhub day change"
                  />
                
                  

                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search ticker, company, side, sector, flags..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
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
                    
                  ].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        activeFilter === filter
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}

                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-slate-500">
                    Showing {filteredPositions.length} of {localPositions.length}
                  </span>

                  
                </div>
                </div>

                <PositionGrid
                  title="Long Positions"
                  tone="green"
                  positions={longPositions}
                  selectedId={selectedPosition?.id}
                  onSelect={setSelectedPosition}
                  onMarketData={setMarketDataPosition}
                  onComment={handleOpenComment}
                  canComment={userCanCreateComments}
                  portfolioPositions={localPositions}
                />

                
                <PositionGrid
                  title="Short Positions"
                  tone="red"
                  positions={shortPositions}
                  selectedId={selectedPosition?.id}
                  onSelect={setSelectedPosition}
                  onMarketData={setMarketDataPosition}
                  onComment={handleOpenComment}
                  canComment={userCanCreateComments}
                  portfolioPositions={localPositions}
                />
              </div>
            </div>

            
           
            
            <TickerDetailPanel
              position={selectedPosition}
              onClose={() => setSelectedPosition(null)}
              onComment={handleOpenComment}
              onMarketData={setMarketDataPosition}
              onFlag={setFlagPosition}
              onLots={setTaxLotsPosition}
              onAddTrade={setManualTradePosition}
              canComment={userCanCreateComments}
              canFlag={userCanCreateFlags}
            />

                          
            <AddTradeModal
              position={manualTradePosition}
              onClose={() => setManualTradePosition(null)}
              onSave={handleSaveManualTrade}
            />

                  
            <MarketDataModal
              position={marketDataPosition}
              onClose={() => setMarketDataPosition(null)}
            />


            <CommentModal
              position={commentPosition}
              onClose={() => setCommentPosition(null)}
              onSave={handleSaveComment}
            />
            <TaxLotsModal
              position={taxLotsPosition}
              onClose={() => setTaxLotsPosition(null)}
            />

            <FlagModal
              position={flagPosition}
              onClose={() => setFlagPosition(null)}
              onSave={handleSaveFlag}
            />
          </div>
        </section>
      </div>
    </main>
  );
}