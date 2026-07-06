type DashboardMetricPosition = {
  source?: string | null;
  shares?: number | string | null;
  marketValue?: number | string | null;
  costBasis?: number | string | null;
  unrealizedPnl?: number | string | null;
  comments?: unknown[] | null;
};
function getNumber(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}
export function getDisplayPortfolioPct(
  position: DashboardMetricPosition,
  positions: DashboardMetricPosition[]
) {
  const positionMarketValue = getNumber(position.marketValue);

  if (!positionMarketValue) {
    return null;
  }

  const grossMarketValue = positions.reduce(
    (sum, currentPosition) =>
      sum + Math.abs(getNumber(currentPosition.marketValue) ?? 0),
    0
  );

  if (!grossMarketValue) {
    return null;
  }

  return (Math.abs(positionMarketValue) / grossMarketValue) * 100;
}
export function getWellsImpliedPrice(position: any) {
  const shares = getNumber(position.shares);
  const marketValue = getNumber(position.marketValue);

  if (!shares || !marketValue) {
    return null;
  }

  return Math.abs(marketValue / shares);
}

export function getWellsWap(position: any) {
  const shares = getNumber(position.shares);
  const costBasis = getNumber(position.costBasis);

  if (!shares || !costBasis) {
    return null;
  }

  return Math.abs(costBasis / shares);
}

export function getWellsTotalPctChange(position: any) {
  const unrealizedPnl = getNumber(position.unrealizedPnl);
  const costBasis = getNumber(position.costBasis);

  if (unrealizedPnl == null || !costBasis) {
    return null;
  }

  return (unrealizedPnl / Math.abs(costBasis)) * 100;
}

export function getWellsUnrealizedPnl(position: any) {
  const unrealizedPnl = getNumber(position.unrealizedPnl);

  if (unrealizedPnl == null) {
    return null;
  }

  return unrealizedPnl;
}

export function getDisplayCurrentPrice(position: any) {
  if (position.source === "WELLS_FARGO") {
    return getWellsImpliedPrice(position);
  }

  return null;
}

export function getDisplayWap(position: any) {
  if (position.source === "WELLS_FARGO") {
    return getWellsWap(position);
  }

  return null;
}

export function getDisplayTotalPctChange(position: any) {
  if (position.source === "WELLS_FARGO") {
    return getWellsTotalPctChange(position);
  }

  return null;
}

export function getDashboardStats(positions: any[]) {
  const totalMarketValue = positions.reduce(
    (sum, position) => sum + (getNumber(position.marketValue) ?? 0),
    0
  );

  const totalUnrealizedPnl = positions.reduce(
    (sum, position) => sum + (getWellsUnrealizedPnl(position) ?? 0),
    0
  );

  const dayPnl = null;

  const commentedItems = positions.filter(
    (position) => position.comments?.length > 0
  ).length;

  return {
    totalMarketValue,
    totalUnrealizedPnl,
    dayPnl,
    commentedItems,
  };
}