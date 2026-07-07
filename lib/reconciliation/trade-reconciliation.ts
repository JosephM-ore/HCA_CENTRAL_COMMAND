export type TradeMatchResult =
  | {
      status: "EXACT";
      trade: any;
      reason: string;
    }
  | {
      status: "SIMILAR";
      trade: any;
      reason: string;
      differences: Record<string, unknown>;
    }
  | {
      status: "NONE";
    };

function sameUtcDate(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function absDiff(a: number, b: number) {
  return Math.abs(a - b);
}

export function matchManualTrade(params: {
  manualTrades: any[];
  wellsTrade: {
    tradeType?: string | null;
    dateTraded: Date;
    shares: number;
    avgPrice: number;
  };
}): TradeMatchResult {
  const { manualTrades, wellsTrade } = params;

  const sameTypeAndDate = manualTrades.filter((manualTrade) => {
    if (!manualTrade.dateTraded) return false;

    return (
      manualTrade.tradeType === wellsTrade.tradeType &&
      sameUtcDate(new Date(manualTrade.dateTraded), wellsTrade.dateTraded)
    );
  });

  if (!sameTypeAndDate.length) {
    return { status: "NONE" };
  }

  const exact = sameTypeAndDate.find((manualTrade) => {
    return (
      absDiff(Number(manualTrade.shares), wellsTrade.shares) <= 0.001 &&
      absDiff(Number(manualTrade.avgPrice), wellsTrade.avgPrice) <= 0.02
    );
  });

  if (exact) {
    return {
      status: "EXACT",
      trade: exact,
      reason: "Manual trade matched Wells transaction by ticker, type, date, shares, and price.",
    };
  }

  const similar = sameTypeAndDate.find((manualTrade) => {
    return (
      absDiff(Number(manualTrade.shares), wellsTrade.shares) <=
        Math.max(10, Math.abs(wellsTrade.shares) * 0.02) ||
      absDiff(Number(manualTrade.avgPrice), wellsTrade.avgPrice) <= 0.25
    );
  });

  if (similar) {
    return {
      status: "SIMILAR",
      trade: similar,
      reason: "Manual trade is similar to Wells transaction but differs in shares or price.",
      differences: {
        manualShares: similar.shares,
        wellsShares: wellsTrade.shares,
        manualAvgPrice: similar.avgPrice,
        wellsAvgPrice: wellsTrade.avgPrice,
      },
    };
  }

  return { status: "NONE" };
}