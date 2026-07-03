import crypto from "node:crypto";

export type WellsTaxLotPosition = {
  accountNumber: string;
  ticker: string;
  securityName: string;
  productType?: string;
  shares: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  wap: number;
  side: "LONG" | "SHORT";
  openedAt?: string;
  status: "ACTIVE";
  source: "WELLS_FARGO";
  sourceReportDate?: string;
  sourceFileName?: string;
  sourceRowHash: string;
  ingestionRunId?: string;
};

export type WellsTaxLotParseResult = {
  rows: WellsTaxLotPosition[];
  positions: WellsTaxLotPosition[];
  failures: string[];
};

const PRODUCT_TYPES = new Set([
  "Common Stocks",
  "Equity Options",
  "Exchange Traded Funds",
  "Limited Partnerships",
  "Money Market Mutual Fund",
  "Real Estate Investment Trusts",
  "Warrants",
]);

function parseNumber(value: string | undefined | null): number | undefined {
  if (value == null) return undefined;

  const cleaned = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/^\((.*)\)$/, "-$1");

  if (!cleaned) return undefined;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function safeDate(value: string | undefined | null): string | undefined {
  if (!value) return undefined;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function hashString(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function extractAccountNumber(content: string): string {
  const accountLineMatch = content.match(/Account:\s+.+?\(([^)]+)\)/);
  return accountLineMatch?.[1]?.trim() ?? "";
}

function extractReportDate(content: string): string | undefined {
  const dateMatch = content.match(
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/
  );

  return safeDate(dateMatch?.[0]);
}

function isTaxLotRow(line: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}/.test(line.trim());
}

function isLikelySecurityHeader(line: string): boolean {
  if (!line) return false;
  if (isTaxLotRow(line)) return false;
  if (line.includes("Investment Total")) return false;
  if (line.includes("Total")) return false;
  if (line.includes("Custodian")) return false;
  if (line.includes("USD/USD FX Rate")) return false;

  return /^.+?\s+\([^)]+\)$/.test(line.trim());
}

function parseSecurityHeader(line: string): {
  securityName: string;
  ticker: string;
} | null {
  if (!isLikelySecurityHeader(line)) return null;

  const match = line.trim().match(/^(.+?)\s+\(([^)]+)\)$/);

  if (!match) return null;

  return {
    securityName: match[1].trim(),
    ticker: match[2].trim(),
  };
}

function parseInvestmentTotalLine(params: {
  line: string;
  accountNumber: string;
  currentSecurityName: string | null;
  currentProductType: string | null;
  sourceReportDate?: string;
  sourceFileName: string;
}): WellsTaxLotPosition | null {
  const {
    line,
    accountNumber,
    currentSecurityName,
    currentProductType,
    sourceReportDate,
    sourceFileName,
  } = params;

  const totalMatch = line.match(/Investment Total:\s+\(([^)]+)\)\s+(.+)$/);

  if (!totalMatch) return null;

  const ticker = totalMatch[1].trim();
  const tokens = totalMatch[2].trim().split(/\s+/);

  // Expected tokens after ticker:
  // 0 shares
  // 1 local/reporting cost basis
  // 2 local/reporting market value
  // 3 duplicate cost basis
  // 4 duplicate market value
  // 5 unrealized price gain/loss
  // 6 unrealized FX gain/loss
  const shares = parseNumber(tokens[0]);
  const costBasis = parseNumber(tokens[1]);
  const marketValue = parseNumber(tokens[2]);
  const unrealizedPriceGainLoss = parseNumber(tokens[5]);
  const unrealizedFxGainLoss = parseNumber(tokens[6]) ?? 0;

  if (
    shares == null ||
    costBasis == null ||
    marketValue == null ||
    unrealizedPriceGainLoss == null
  ) {
    return null;
  }

  const unrealizedPnl = unrealizedPriceGainLoss + unrealizedFxGainLoss;
  const wap = shares !== 0 ? Math.abs(costBasis / shares) : 0;

  return {
    accountNumber,
    ticker,
    securityName: currentSecurityName ?? ticker,
    productType: currentProductType ?? undefined,
    shares,
    marketValue,
    costBasis,
    unrealizedPnl,
    wap,
    side: shares < 0 ? "SHORT" : "LONG",
    openedAt: undefined,
    status: "ACTIVE",
    source: "WELLS_FARGO",
    sourceReportDate,
    sourceFileName,
    sourceRowHash: hashString(`${sourceFileName}|${line}`),
    ingestionRunId: undefined,
  };
}

export function parseWellsTaxLotCsv(
  content: string,
  sourceFileName: string
): WellsTaxLotParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const accountNumber = extractAccountNumber(content);
  const sourceReportDate = extractReportDate(content);

  const positions: WellsTaxLotPosition[] = [];
  const failures: string[] = [];

  let currentProductType: string | null = null;
  let currentSecurityName: string | null = null;
  let currentTicker: string | null = null;

  if (!accountNumber) {
    failures.push("Could not extract account number from Tax Lot report.");
  }

  for (const line of lines) {
    if (PRODUCT_TYPES.has(line)) {
      currentProductType = line;
      continue;
    }

    const securityHeader = parseSecurityHeader(line);

    if (securityHeader) {
      currentSecurityName = securityHeader.securityName;
      currentTicker = securityHeader.ticker;
      continue;
    }

    if (!line.includes("Investment Total:")) {
      continue;
    }

    const position = parseInvestmentTotalLine({
      line,
      accountNumber,
      currentSecurityName,
      currentProductType,
      sourceReportDate,
      sourceFileName,
    });

    if (!position) {
      failures.push(`Failed to parse Investment Total row: ${line}`);
      continue;
    }

    if (currentTicker && position.ticker !== currentTicker) {
      failures.push(
        `Ticker mismatch near Investment Total row. Header ticker=${currentTicker}, total ticker=${position.ticker}`
      );
    }

    positions.push(position);
  }

  return {
    rows: positions,
    positions,
    failures,
  };
}
