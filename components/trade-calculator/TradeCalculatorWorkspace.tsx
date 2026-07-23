"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Badge from "@/components/common/Badge";
import TradeScenarioPanel from "@/components/trade-calculator/TradeScenarioPanel";
import { canLogManualTrade } from "@/lib/client-permissions";
import { buildTradeHistoryAnalytics } from "@/lib/dashboard/trade-history-analytics";

import type {
  TradeBaselineMode,
} from "@/lib/trade-calculator/trade-calculator";

type FundEquitySnapshot = {
  id: string;
  asOfDate: string;
  netEquity: number;
  source: string;
};

type TradeCalculatorWorkspaceProps = {
  securities: any[];
  grossPortfolioMarketValue: number;
  fundEquitySnapshots: FundEquitySnapshot[];
};

function toFiniteNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

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

function formatSignedNumber(
  value: number | null | undefined
) {
  if (
    value == null ||
    !Number.isFinite(value) ||
    Math.abs(value) < 0.000001
  ) {
    return "—";
  }

  const formattedValue = Math.abs(
    value
  ).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

  return `${value > 0 ? "+" : "-"}${formattedValue}`;
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

  return `${value.toFixed(2)}%`;
}

function signedValueClass(
  value: number | null | undefined
) {
  if (
    value == null ||
    Math.abs(value) < 0.000001
  ) {
    return "text-slate-500";
  }

  return value > 0
    ? "text-emerald-600"
    : "text-rose-600";
}

function getWellsImpliedPrice(
  position: any
) {
  const shares = toFiniteNumber(
    position?.shares
  );

  const marketValue = toFiniteNumber(
    position?.marketValue
  );

  if (
    shares == null ||
    marketValue == null ||
    shares === 0
  ) {
    return null;
  }

  return Math.abs(
    marketValue / shares
  );
}

function getCurrentPrice(
  security: any,
  position: any
) {
  const marketData =
    security?.marketData?.[0];

  const quotePrice = toFiniteNumber(
    marketData?.currentPrice
  );

  if (
    marketData?.marketDataSource ===
      "FINNHUB" &&
    quotePrice != null
  ) {
    return quotePrice;
  }

  return getWellsImpliedPrice(position);
}

function getWellsWap(position: any) {
  const shares = toFiniteNumber(
    position?.shares
  );

  const costBasis = toFiniteNumber(
    position?.costBasis
  );

  if (
    shares == null ||
    costBasis == null ||
    shares === 0
  ) {
    return null;
  }

  return Math.abs(
    costBasis / shares
  );
}

function getWellsPortfolioWeight(
  position: any,
  grossPortfolioMarketValue: number
) {
  const marketValue = toFiniteNumber(
    position?.marketValue
  );

  if (
    marketValue == null ||
    grossPortfolioMarketValue <= 0
  ) {
    return null;
  }

  return (
    (Math.abs(marketValue) /
      grossPortfolioMarketValue) *
    100
  );
}

function BaselineCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  tone?: "default" | "violet";
}) {
  const toneClass =
    tone === "violet"
      ? "border-violet-200 bg-violet-50"
      : "border-slate-200 bg-white";

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-2 text-xl font-semibold text-slate-950">
        {value}
      </div>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}

export default function TradeCalculatorWorkspace({
  securities,
  grossPortfolioMarketValue,
  fundEquitySnapshots,
}: TradeCalculatorWorkspaceProps) {
  const [
    localSecurities,
    setLocalSecurities,
  ] = useState<any[]>(securities);

  const [
    currentUser,
    setCurrentUser,
  ] = useState<any | null>(null);

  const [securityQuery, setSecurityQuery] =
    useState("");

  const [selectedSecurityId, setSelectedSecurityId] =
    useState("");

  const [selectedPositionId, setSelectedPositionId] =
    useState("");

  const [baselineMode, setBaselineMode] =
    useState<TradeBaselineMode>(
      "WELLS_PLUS_PENDING"
    );
  useEffect(() => {
    let isCancelled = false;

    async function loadCurrentUser() {
      const response = await fetch(
        "/api/auth/me",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (!isCancelled) {
        setCurrentUser(data.user);
      }
    }

    loadCurrentUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  const normalizedQuery =
    securityQuery.trim().toLowerCase();

  const filteredSecurities = useMemo(
    () =>
      localSecurities.filter((security) => {
        if (!normalizedQuery) {
          return true;
        }

        const searchable = [
          security.ticker,
          security.name,
          security.sector,
          security.industry,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(
          normalizedQuery
        );
      }),
    [localSecurities, normalizedQuery]
  );

  const selectedSecurity =
    localSecurities.find(

      (security) =>
        security.id === selectedSecurityId
    ) ?? null;

  const selectedSecurityPositions =
    Array.isArray(
      selectedSecurity?.positions
    )
      ? selectedSecurity.positions
      : [];

  const selectedPosition =
    selectedSecurityPositions.find(
      (position: any) =>
        position.id === selectedPositionId
    ) ?? null;

  useEffect(() => {
    if (
      selectedSecurityPositions.length ===
      1
    ) {
      setSelectedPositionId(
        selectedSecurityPositions[0].id
      );

      return;
    }

    setSelectedPositionId("");
  }, [
    selectedSecurityId,
    selectedSecurityPositions.length,
  ]);

  useEffect(() => {
    setBaselineMode(
      "WELLS_PLUS_PENDING"
    );
  }, [selectedPositionId]);

  const currentPrice = selectedPosition
    ? getCurrentPrice(
        selectedSecurity,
        selectedPosition
      )
    : null;

  const analytics = useMemo(
    () =>
      selectedPosition
        ? buildTradeHistoryAnalytics({
            positionSide:
              selectedPosition.side,
            currentShares:
              selectedPosition.shares,
            currentPrice,
            trades: Array.isArray(
              selectedPosition.trades
            )
              ? selectedPosition.trades
              : [],
          })
        : null,
    [
      selectedPosition,
      currentPrice,
    ]
  );

  const selectedBaselineExposure =
    baselineMode ===
      "WELLS_PLUS_PENDING"
      ? analytics?.projectedExposure ??
        null
      : analytics?.wellsExposure ??
        null;

  const selectedBaselineSide =
    selectedPosition?.side === "SHORT"
      ? "Short"
      : selectedPosition
        ? "Long"
        : "—";

  const wellsWap =
    selectedPosition
      ? getWellsWap(
          selectedPosition
        )
      : null;

  const wellsPortfolioWeight =
    selectedPosition
      ? getWellsPortfolioWeight(
          selectedPosition,
          grossPortfolioMarketValue
        )
      : null;
  function handleTradeCreated(
    trade: any
  ) {
    setLocalSecurities(
      (currentSecurities) =>
        currentSecurities.map(
          (security) => {
            if (
              security.id !==
              trade.securityId
            ) {
              return security;
            }

            return {
              ...security,
              positions: (
                security.positions || []
              ).map((position: any) => {
                if (
                  position.id !==
                  trade.positionId
                ) {
                  return position;
                }

                return {
                  ...position,
                  trades: [
                    trade,
                    ...(position.trades || []),
                  ],
                };
              }),
            };
          }
        )
    );
  }
  function handleSecurityChange(
    securityId: string
  ) {
    setSelectedSecurityId(
      securityId
    );

    setSelectedPositionId("");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Step 1
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            Select a Security
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Choose the Security and active Wells
            position that will form the scenario
            baseline.
          </p>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-slate-700">
            Search Securities
          </label>

          <input
            value={securityQuery}
            onChange={(event) =>
              setSecurityQuery(
                event.target.value
              )
            }
            placeholder="Search ticker, company, sector, or industry..."
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">
            Security
          </label>

          <select
            value={selectedSecurityId}
            onChange={(event) =>
              handleSecurityChange(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">
              Select a Security
            </option>

            {filteredSecurities.map(
              (security) => (
                <option
                  key={security.id}
                  value={security.id}
                >
                  {security.ticker} —{" "}
                  {security.name}
                </option>
              )
            )}
          </select>

          {normalizedQuery &&
          filteredSecurities.length === 0 ? (
            <p className="mt-2 text-xs font-medium text-amber-700">
              No Securities matched the search.
            </p>
          ) : null}
        </div>

        {selectedSecurity ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-950">
                {selectedSecurity.ticker}
              </span>

              {selectedSecurity.sector ? (
                <Badge tone="slate">
                  {selectedSecurity.sector}
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-slate-600">
              {selectedSecurity.name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {selectedSecurity.industry ||
                "Industry not available"}
            </p>
          </div>
        ) : null}

        {selectedSecurity &&
        selectedSecurityPositions.length >
          1 ? (
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">
              Active Wells Position
            </label>

            <select
              value={selectedPositionId}
              onChange={(event) =>
                setSelectedPositionId(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">
                Select a position
              </option>

              {selectedSecurityPositions.map(
                (position: any) => (
                  <option
                    key={position.id}
                    value={position.id}
                  >
                    {position.side} •{" "}
                    {position.accountNumber ||
                      "No account"}{" "}
                    •{" "}
                    {formatNumber(
                      Math.abs(
                        Number(
                          position.shares
                        ) || 0
                      )
                    )}{" "}
                    shares
                  </option>
                )
              )}
            </select>
          </div>
        ) : null}

        {selectedSecurity &&
        selectedSecurityPositions.length ===
          0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            This Security does not currently have an
            active Wells position. Calculation for
            new-position scenarios will be added in
            the next calculator stage, but manual
            trade submission will remain unavailable
            without an active position.
          </div>
        ) : null}

        {selectedPosition ? (
          <div className="mt-5">
            <label className="text-sm font-medium text-slate-700">
              Scenario Baseline
            </label>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setBaselineMode(
                    "WELLS"
                  )
                }
                className={`rounded-2xl px-3 py-3 text-sm font-medium ${
                  baselineMode === "WELLS"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Wells Position
              </button>

              <button
                type="button"
                onClick={() =>
                  setBaselineMode(
                    "WELLS_PLUS_PENDING"
                  )
                }
                className={`rounded-2xl px-3 py-3 text-sm font-medium ${
                  baselineMode ===
                  "WELLS_PLUS_PENDING"
                    ? "bg-violet-700 text-white"
                    : "border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                }`}
              >
                Wells + Pending
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Wells + Pending applies visible
              MANUAL_PENDING trades forward from the
              authoritative Wells position.
            </p>
          </div>
        ) : null}
      </section>

      <section className="min-w-0">
        {!selectedSecurity ? (
          <div className="flex min-h-[430px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl font-semibold text-slate-500">
                1
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                Select a Security to begin
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                HCA will load the Wells position,
                current market data, pending manual
                trades, and portfolio weight basis.
              </p>
            </div>
          </div>
        ) : !selectedPosition ? (
          <div className="flex min-h-[430px] items-center justify-center rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
            <div>
              <h3 className="text-lg font-semibold text-amber-900">
                Active position required for this stage
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-amber-800">
                Select an active Wells position when
                multiple positions exist. If no active
                position exists, the new-position
                calculator workflow will be enabled in
                the next stage.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current Position
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold text-slate-950">
                      {selectedSecurity.ticker}
                    </h3>

                    <Badge
                      tone={
                        selectedPosition.side ===
                        "SHORT"
                          ? "red"
                          : "green"
                      }
                    >
                      {selectedPosition.side}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedSecurity.name}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    Gross Portfolio Basis
                  </p>

                  <p className="mt-1 font-semibold text-slate-950">
                    {formatMoney(
                      grossPortfolioMarketValue
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <BaselineCard
                label="Wells Position"
                value={
                  <span>
                    {formatNumber(
                      analytics?.wellsExposure
                    )}{" "}
                    <span className="text-sm text-slate-500">
                      {selectedPosition.side ===
                      "SHORT"
                        ? "Short"
                        : "Long"}
                    </span>
                  </span>
                }
                detail="Authoritative Wells exposure"
              />

              <BaselineCard
                label="Pending Manual Delta"
                value={
                  <span
                    className={signedValueClass(
                      analytics?.pendingManualDelta
                    )}
                  >
                    {formatSignedNumber(
                      analytics?.pendingManualDelta
                    )}
                  </span>
                }
                detail={`${analytics?.pendingTradeCount ?? 0} pending manual ${
                  analytics?.pendingTradeCount === 1
                    ? "trade"
                    : "trades"
                }`}
                tone="violet"
              />

              <BaselineCard
                label="Selected Baseline"
                value={
                  <span>
                    {formatNumber(
                      selectedBaselineExposure
                    )}{" "}
                    <span className="text-sm text-slate-500">
                      {selectedBaselineSide}
                    </span>
                  </span>
                }
                detail={
                  baselineMode === "WELLS"
                    ? "Wells-only scenario basis"
                    : "Includes pending manual activity"
                }
                tone={
                  baselineMode ===
                  "WELLS_PLUS_PENDING"
                    ? "violet"
                    : "default"
                }
              />

              <BaselineCard
                label="Wells Portfolio Weight"
                value={formatPercent(
                  wellsPortfolioWeight
                )}
                detail="Absolute Wells market value ÷ gross portfolio"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <BaselineCard
                label="Current Price"
                value={formatPrice(
                  currentPrice
                )}
                detail={
                  selectedSecurity
                    .marketData?.[0]
                    ?.marketDataSource ===
                  "FINNHUB"
                    ? "Finnhub market price"
                    : "Wells implied price"
                }
              />

              <BaselineCard
                label="Wells WAP"
                value={formatPrice(
                  wellsWap
                )}
                detail="Wells cost basis ÷ shares"
              />

              <BaselineCard
                label="Wells Market Value"
                value={formatMoney(
                  toFiniteNumber(
                    selectedPosition.marketValue
                  )
                )}
                detail="Authoritative position value"
              />

              <BaselineCard
                label="Pending Projection"
                value={
                  analytics?.pendingProjectionIsValid
                    ? formatNumber(
                        analytics.projectedExposure
                      )
                    : "Invalid"
                }
                detail={
                  analytics?.pendingProjectionIsValid
                    ? "Wells plus pending manual trades"
                    : "Pending activity would create invalid exposure"
                }
                tone="violet"
              />
            </div>

            {analytics &&
            !analytics.pendingProjectionIsValid ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                The pending manual trades do not
                produce a valid operational baseline.
                Review the pending trade history before
                modeling another trade.
              </div>
            ) : null}

            {baselineMode ===
              "WELLS_PLUS_PENDING" &&
            analytics &&
            analytics.pendingTradeCount > 0 ? (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-800">
                This scenario baseline includes{" "}
                <span className="font-semibold">
                  {analytics.pendingTradeCount}
                </span>{" "}
                unreconciled manual{" "}
                {analytics.pendingTradeCount === 1
                  ? "trade"
                  : "trades"}
                . Wells remains authoritative until
                reconciliation.
              </div>
            ) : null}

            {analytics ? (
              <TradeScenarioPanel
                security={selectedSecurity}
                position={selectedPosition}
                baselineMode={baselineMode}
                pendingManualDelta={
                  analytics.pendingManualDelta
                }
                pendingProjectionIsValid={
                  analytics.pendingProjectionIsValid
                }
                currentPrice={currentPrice}
                wellsWap={wellsWap}
                grossPortfolioMarketValue={
                  grossPortfolioMarketValue
                }
                fundEquitySnapshots={
                  fundEquitySnapshots
                }
                canSubmitManualTrade={
                  canLogManualTrade(
                    currentUser?.role
                  )
                }
                onTradeCreated={
                  handleTradeCreated
                }
              />
            ) : null}

          </div>
        )}
      </section>
    </div>
  );
}
