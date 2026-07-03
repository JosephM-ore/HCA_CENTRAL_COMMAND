import crypto from "node:crypto";
import { parse as parseCsv } from "csv-parse/sync";

export type WellsTaxLotRow = {
  securityName: string;
  ticker?: string;
  securityId?: string;
  securityIdType?: string;
  wfSecId?: string;
  taxLotId?: string;
  taxLotDate?: string;
  quantity?: number;
  marketPrice?: number;
  unitCost?: number;
  costBasis?: number;
  marketValue?: number;
  unrealizedPriceGainLoss?: number;
  unrealizedFxGainLoss?: number;
  holdingPeriod?: string;
  daysToLongTerm?: number;
  roi?: number;
  productType?: string;
  accountNumber: string;
  sourceReportDate?: string;
  sourceFileName?: string;
  sourceRowHash: string;
};

export type WellsTaxLotPosition = {
  accountNumber: string;
  ticker?: string;
  securityName: string;
  shares: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  wap: number;
  side: string;
  openedAt?: string;
  status: string;
  source: string;
  sourceReportDate?: string;
  sourceFileName?: string;
  sourceRowHash: string;
  ingestionRunId?: string;
};

const knownTaxLotHeaders = [
  "businessdate",
  "accountnumber",
  "accountname",
  "legalentityname",
  "localcurrency",
  "securitydescription",
  "securityid",
  "securityidtype",
  "wfsecid",
  "datetype",
  "activity",
  "status",
  "postdate",
  "tradedate",
  "settledate",
  "counterparty",
  "clientreferenceid",
  "wftransactionid",
  "quantity",
  "price",
  "commission",
  "fees",
  "accruedinterest",
  "netamount",
  "cusip",
  "isin",
  "sedol",
];

export type WellsTaxLotParseResult = {
  rows: WellsTaxLotRow[];
  positions: WellsTaxLotPosition[];
  failures: string[];
};

function parseFloatOrUndefined(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function safeDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function hashRow(row: Record<string, string>): string {
  const normalized = Object.entries(row)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function parseWellsTaxLotCsv(content: string, sourceFileName: string): WellsTaxLotParseResult {
  const records = parseCsv(content, { columns: true, skip_empty_lines: true, trim: true });
  const rows: WellsTaxLotRow[] = [];
  const failures: string[] = [];

  for (const rawRow of records) {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawRow)) {
      lower[k.trim().toLowerCase()] = String(v).trim();
    }

    const accountNumber = lower["accountnumber"] || lower["accountname"] || "";
    const securityName = lower["securitydescription"] || lower["securityid"] || "";
    const securityId = lower["securityid"] || undefined;
    const securityIdType = lower["securityidtype"] || undefined;
    const ticker = securityIdType === "TS" ? securityId : undefined;

    const quantity = parseFloatOrUndefined(lower["quantity"]);
    const marketValue = parseFloatOrUndefined(lower["netamount"]);
    const costBasis = parseFloatOrUndefined(lower["price"] && lower["quantity"] ? String(Number(lower["price"]) * Number(lower["quantity"])) : "") || parseFloatOrUndefined(lower["costbasis"]);
    const unrealizedPriceGainLoss = parseFloatOrUndefined(lower["unrealizedpricegainloss"]);
    const unrealizedFxGainLoss = parseFloatOrUndefined(lower["unrealizedfxgainloss"]);

    const rowHash = hashRow(lower);
    const sourceRowHash = rowHash;

    if (!accountNumber) {
      failures.push(`Missing accountNumber for row: ${JSON.stringify(lower)}`);
      continue;
    }

    if (!securityName && !ticker) {
      failures.push(`Missing securityName/ticker for row: ${JSON.stringify(lower)}`);
      continue;
    }

    if (quantity == null || Number.isNaN(quantity)) {
      failures.push(`Invalid quantity for row: ${JSON.stringify(lower)}`);
      continue;
    }

    if (marketValue == null || Number.isNaN(marketValue)) {
      failures.push(`Invalid marketValue for row: ${JSON.stringify(lower)}`);
      continue;
    }

    const row: WellsTaxLotRow = {
      securityName,
      ticker,
      securityId,
      securityIdType,
      wfSecId: lower["wfsecid"],
      taxLotId: lower["wftransactionid"] || undefined,
      taxLotDate: safeDate(lower["tradedate"] || lower["postdate"] || lower["businessdate"]),
      quantity,
      marketPrice: parseFloatOrUndefined(lower["price"]),
      unitCost: parseFloatOrUndefined(lower["price"]),
      costBasis: costBasis,
      marketValue,
      unrealizedPriceGainLoss,
      unrealizedFxGainLoss,
      holdingPeriod: lower["holdingperiod"],
      daysToLongTerm: parseFloatOrUndefined(lower["daystolongterm"]),
      roi: parseFloatOrUndefined(lower["roi"]),
      productType: lower["securityidtype"],
      accountNumber,
      sourceReportDate: safeDate(lower["businessdate"]),
      sourceFileName,
      sourceRowHash,
    };

    rows.push(row);
  }

  const positionsByKey = new Map<string, WellsTaxLotPosition>();

  for (const row of rows) {
    const key = `${row.accountNumber}|${row.ticker || row.securityName}`;
    const existing = positionsByKey.get(key);
    const currentUnrealized = (row.unrealizedPriceGainLoss || 0) + (row.unrealizedFxGainLoss || 0);
    const openedAt = row.taxLotDate || undefined;

    const aggregated: WellsTaxLotPosition = {
      accountNumber: row.accountNumber,
      ticker: row.ticker,
      securityName: row.securityName,
      shares: 0,
      marketValue: 0,
      costBasis: 0,
      unrealizedPnl: 0,
      wap: 0,
      side: "LONG",
      openedAt,
      status: "ACTIVE",
      source: "WELLS_FARGO",
      sourceReportDate: row.sourceReportDate,
      sourceFileName,
      sourceRowHash: row.sourceRowHash,
      ingestionRunId: undefined,
    };

    const quantity = row.quantity ?? 0;
    const marketValue = row.marketValue ?? 0;
    const costBasis = row.costBasis ?? 0;

    if (existing) {
      aggregated.shares = existing.shares + quantity;
      aggregated.marketValue = existing.marketValue + marketValue;
      aggregated.costBasis = existing.costBasis + costBasis;
      aggregated.unrealizedPnl = existing.unrealizedPnl + currentUnrealized;
      aggregated.openedAt = [existing.openedAt, openedAt].filter(Boolean).sort()[0];
    } else {
      aggregated.shares = quantity;
      aggregated.marketValue = marketValue;
      aggregated.costBasis = costBasis;
      aggregated.unrealizedPnl = currentUnrealized;
    }

    aggregated.side = aggregated.shares < 0 ? "SHORT" : "LONG";
    aggregated.wap = aggregated.shares !== 0 ? Math.abs(aggregated.costBasis / aggregated.shares) : 0;
    aggregated.openedAt = existing?.openedAt || openedAt;

    positionsByKey.set(key, aggregated);
  }

  return {
    rows,
    positions: Array.from(positionsByKey.values()),
    failures,
  };
}
