export type TradeHistorySource = {
  id: string;
  dateTraded: string | Date;
  shares: number;
  avgPrice: number;
  tradeType?: string | null;
  notional?: number | null;
  source?: string | null;
  reconciliationStatus?: string | null;
  comment?: string | null;
  createdAt?: string | Date | null;
};

export type TradeHistoryRow = {
  trade: TradeHistorySource;
  tradeType: string;
  absoluteShares: number;
  notional: number | null;
  positionBefore: number | null;
  positionAfter: number | null;
  positionChangePct: number | null;
  positionChangeLabel: string;
  executionVsCurrentPct: number | null;
  daysSinceTrade: number | null;
  isEntry: boolean;
  isExit: boolean;
  hasValidPositionHistory: boolean;
};

export type TradeHistoryAnalytics = {
  rows: TradeHistoryRow[];
  tradeCount: number;
  entryTradeCount: number;
  exitTradeCount: number;
  totalSharesTraded: number;
  grossTradeNotional: number;
  weightedEntryPrice: number | null;
  weightedExitPrice: number | null;
  firstTradeAt: string | Date | null;
  mostRecentTradeAt: string | Date | null;
  daysSinceLastTrade: number | null;
  largestAddPct: number | null;
  largestReductionPct: number | null;
  derivedStartingExposure: number | null;
  historyIsComplete: boolean;
};

type BuildTradeHistoryAnalyticsInput = {
  positionSide: string;
  currentShares: number | null | undefined;
  currentPrice: number | null | undefined;
  trades: TradeHistorySource[];
};

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function normalizeTradeType(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function isEntryTrade(
  positionSide: string,
  tradeType: string
) {
  if (positionSide === "SHORT") {
    return (
      tradeType === "SHORT" ||
      tradeType === "SELL"
    );
  }

  return tradeType === "BUY";
}

function isExitTrade(
  positionSide: string,
  tradeType: string
) {
  if (positionSide === "SHORT") {
    return (
      tradeType === "COVER" ||
      tradeType === "BUY"
    );
  }

  return tradeType === "SELL";
}

function getExposureDelta(
  positionSide: string,
  tradeType: string,
  storedShares: number
) {
  const absoluteShares = Math.abs(storedShares);

  if (isEntryTrade(positionSide, tradeType)) {
    return absoluteShares;
  }

  if (isExitTrade(positionSide, tradeType)) {
    return -absoluteShares;
  }

  if (positionSide === "SHORT") {
    return storedShares < 0
      ? absoluteShares
      : -absoluteShares;
  }

  return storedShares >= 0
    ? absoluteShares
    : -absoluteShares;
}

function calculateDaysSince(
  value: string | Date | null | undefined
) {
  if (!value) {
    return null;
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  const elapsedMilliseconds =
    Date.now() - dateValue.getTime();

  return Math.max(
    0,
    Math.floor(
      elapsedMilliseconds / millisecondsPerDay
    )
  );
}

function calculateExecutionVsCurrent(
  positionSide: string,
  isEntry: boolean,
  executionPrice: number | null,
  currentPrice: number | null
) {
  if (
    !isEntry ||
    executionPrice == null ||
    currentPrice == null ||
    executionPrice === 0
  ) {
    return null;
  }

  if (positionSide === "SHORT") {
    return (
      ((executionPrice - currentPrice) /
        executionPrice) *
      100
    );
  }

  return (
    ((currentPrice - executionPrice) /
      executionPrice) *
    100
  );
}

function calculateWeightedTradePrice(
  rows: TradeHistoryRow[],
  tradeKind: "ENTRY" | "EXIT"
) {
  const pricedRows = rows.filter((row) => {
    const matchesKind =
      tradeKind === "ENTRY"
        ? row.isEntry
        : row.isExit;

    return (
      matchesKind &&
      toFiniteNumber(row.trade.avgPrice) != null &&
      row.absoluteShares > 0
    );
  });

  const totalShares = pricedRows.reduce(
    (total, row) =>
      total + row.absoluteShares,
    0
  );

  if (totalShares === 0) {
    return null;
  }

  const weightedValue = pricedRows.reduce(
    (total, row) => {
      const price =
        toFiniteNumber(row.trade.avgPrice) ?? 0;

      return (
        total +
        row.absoluteShares * price
      );
    },
    0
  );

  return weightedValue / totalShares;
}

function compareTradesNewestFirst(
  firstTrade: TradeHistorySource,
  secondTrade: TradeHistorySource
) {
  const dateDifference =
    new Date(secondTrade.dateTraded).getTime() -
    new Date(firstTrade.dateTraded).getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  const firstCreatedAt = firstTrade.createdAt
    ? new Date(firstTrade.createdAt).getTime()
    : 0;

  const secondCreatedAt = secondTrade.createdAt
    ? new Date(secondTrade.createdAt).getTime()
    : 0;

  return secondCreatedAt - firstCreatedAt;
}

export function buildTradeHistoryAnalytics({
  positionSide,
  currentShares,
  currentPrice,
  trades,
}: BuildTradeHistoryAnalyticsInput): TradeHistoryAnalytics {
  const normalizedPositionSide =
    positionSide === "SHORT"
      ? "SHORT"
      : "LONG";

  const normalizedCurrentShares =
    toFiniteNumber(currentShares);

  const currentExposure =
    normalizedCurrentShares == null
      ? 0
      : Math.abs(normalizedCurrentShares);

  const normalizedCurrentPrice =
    toFiniteNumber(currentPrice);

  const newestFirstTrades = [...trades].sort(
    compareTradesNewestFirst
  );

  let runningPositionAfter = currentExposure;
  let historyIsComplete = true;

  const rows = newestFirstTrades.map((trade) => {
    const tradeType =
      normalizeTradeType(trade.tradeType);

    const storedShares =
      toFiniteNumber(trade.shares) ?? 0;

    const absoluteShares =
      Math.abs(storedShares);

    const entryTrade = isEntryTrade(
      normalizedPositionSide,
      tradeType
    );

    const exitTrade = isExitTrade(
      normalizedPositionSide,
      tradeType
    );

    const exposureDelta = getExposureDelta(
      normalizedPositionSide,
      tradeType,
      storedShares
    );

    const calculatedPositionBefore =
      runningPositionAfter - exposureDelta;

    const hasValidPositionHistory =
      calculatedPositionBefore >= -0.000001 &&
      runningPositionAfter >= -0.000001;

    if (!hasValidPositionHistory) {
      historyIsComplete = false;
    }

    const positionBefore =
      hasValidPositionHistory
        ? Math.max(0, calculatedPositionBefore)
        : null;

    const positionAfter =
      runningPositionAfter >= -0.000001
        ? Math.max(0, runningPositionAfter)
        : null;

    let positionChangePct: number | null = null;
    let positionChangeLabel = "—";

    if (
      positionBefore === 0 &&
      exposureDelta > 0
    ) {
      positionChangeLabel = "New Position";
    } else if (
      positionBefore != null &&
      positionBefore > 0
    ) {
      positionChangePct =
        (exposureDelta / positionBefore) * 100;

      positionChangeLabel = `${
        positionChangePct >= 0 ? "+" : ""
      }${positionChangePct.toFixed(1)}%`;
    }

    const averagePrice =
      toFiniteNumber(trade.avgPrice);

    const storedNotional =
      toFiniteNumber(trade.notional);

    const notional =
      storedNotional != null
        ? Math.abs(storedNotional)
        : averagePrice != null
          ? absoluteShares * averagePrice
          : null;

    const row: TradeHistoryRow = {
      trade,
      tradeType: tradeType || "UNKNOWN",
      absoluteShares,
      notional,
      positionBefore,
      positionAfter,
      positionChangePct,
      positionChangeLabel,
      executionVsCurrentPct:
        calculateExecutionVsCurrent(
          normalizedPositionSide,
          entryTrade,
          averagePrice,
          normalizedCurrentPrice
        ),
      daysSinceTrade:
        calculateDaysSince(trade.dateTraded),
      isEntry: entryTrade,
      isExit: exitTrade,
      hasValidPositionHistory,
    };

    runningPositionAfter =
      calculatedPositionBefore;

    return row;
  });

  const totalSharesTraded = rows.reduce(
    (total, row) =>
      total + row.absoluteShares,
    0
  );

  const grossTradeNotional = rows.reduce(
    (total, row) =>
      total + (row.notional ?? 0),
    0
  );

  const validDateRows = rows.filter(
    (row) =>
      !Number.isNaN(
        new Date(row.trade.dateTraded).getTime()
      )
  );

  const mostRecentTradeAt =
    validDateRows[0]?.trade.dateTraded ?? null;

  const firstTradeAt =
    validDateRows.length > 0
      ? validDateRows[validDateRows.length - 1]
          .trade.dateTraded
      : null;

  const addPercentages = rows
    .map((row) => row.positionChangePct)
    .filter(
      (value): value is number =>
        value != null && value > 0
    );

  const reductionPercentages = rows
    .map((row) => row.positionChangePct)
    .filter(
      (value): value is number =>
        value != null && value < 0
    );

  const derivedStartingExposure =
    runningPositionAfter >= -0.000001
      ? Math.max(0, runningPositionAfter)
      : null;

  if (
    derivedStartingExposure == null ||
    derivedStartingExposure > 0.000001
  ) {
    historyIsComplete = false;
  }

  return {
    rows,
    tradeCount: rows.length,
    entryTradeCount: rows.filter(
      (row) => row.isEntry
    ).length,
    exitTradeCount: rows.filter(
      (row) => row.isExit
    ).length,
    totalSharesTraded,
    grossTradeNotional,
    weightedEntryPrice:
      calculateWeightedTradePrice(rows, "ENTRY"),
    weightedExitPrice:
      calculateWeightedTradePrice(rows, "EXIT"),
    firstTradeAt,
    mostRecentTradeAt,
    daysSinceLastTrade:
      calculateDaysSince(mostRecentTradeAt),
    largestAddPct:
      addPercentages.length > 0
        ? Math.max(...addPercentages)
        : null,
    largestReductionPct:
      reductionPercentages.length > 0
        ? Math.min(...reductionPercentages)
        : null,
    derivedStartingExposure,
    historyIsComplete,
  };
}