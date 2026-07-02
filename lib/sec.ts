type CompanyFacts = any;

function padCik(cik: string) {
  return cik.replace(/^0+/, "") .padStart(10, "0");
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchCompanyFacts(cik: string): Promise<CompanyFacts | null> {
  const apiAgent = process.env.SEC_API_USER_AGENT;
  if (!apiAgent) throw new Error("Missing SEC_API_USER_AGENT environment variable.");

  const padded = padCik(cik);
  const url = `https://data.sec.gov/api/xbrl/companyfacts/${padded}.json`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": apiAgent,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SEC companyfacts request failed: ${res.status} ${txt}`);
  }

  return res.json();
}

// Extract latest numeric value for a set of tag candidates
function getLatestFactValue(facts: CompanyFacts, candidates: string[]): { value: number | null; asOf?: string } {
  if (!facts || !facts.facts) return { value: null };
  const usgaap = facts.facts["us-gaap"] || {};

  for (const tag of candidates) {
    const entry = usgaap[tag];
    if (!entry || !entry.units) continue;

    // iterate units and values to find the most recent (by end date)
    let best: { val: number; end?: string } | null = null;

    for (const unitKey of Object.keys(entry.units)) {
      const values = entry.units[unitKey] as Array<any>;
      for (const v of values) {
        const val = parseNumber(v.val);
        if (val === null) continue;
        const end = v.end || v.filed || v.filed;
        if (!best) best = { val, end };
        else if (end && best.end && new Date(end) > new Date(best.end)) best = { val, end };
      }
    }

    if (best) return { value: best.val, asOf: best.end };
  }

  return { value: null };
}

// Get array of quarterly values (with end dates) for a tag
function getQuarterlyValues(facts: CompanyFacts, tag: string): Array<{ val: number; end?: string }> {
  const out: Array<{ val: number; end?: string }> = [];
  if (!facts || !facts.facts) return out;
  const usgaap = facts.facts["us-gaap"] || {};
  const entry = usgaap[tag];
  if (!entry || !entry.units) return out;

  for (const unitKey of Object.keys(entry.units)) {
    const values = entry.units[unitKey] as Array<any>;
    for (const v of values) {
      if (v.fp && v.fp !== "FY") { // prefer periodic (Q) entries
        const val = parseNumber(v.val);
        if (val !== null) out.push({ val, end: v.end });
      }
    }
  }

  // sort by end
  out.sort((a, b) => (a.end && b.end ? new Date(a.end).getTime() - new Date(b.end).getTime() : 0));
  return out;
}

function sumLastN(items: Array<{ val: number; end?: string }>, n: number) {
  if (!items.length) return null;
  const last = items.slice(-n);
  if (last.length < n) return null;
  return last.reduce((s, x) => s + x.val, 0);
}

// Compute TTM value from quarterly facts. Fall back to most recent annual if quarterly insufficient.
function computeTTM(facts: CompanyFacts, tagCandidates: string[]): { value: number | null; asOf?: string } {
  for (const candidate of tagCandidates) {
    const q = getQuarterlyValues(facts, candidate);
    const summed = sumLastN(q, 4);
    if (summed !== null) return { value: summed, asOf: q.length ? q[q.length - 1].end : undefined };

    // fallback to latest annual
    const latest = getLatestFactValue(facts, [candidate]);
    if (latest.value !== null) return latest;
  }

  return { value: null };
}

// Public mapping function that extracts many common fundamentals
export async function getSecFundamentals(cik: string) {
  const facts = await fetchCompanyFacts(cik);

  // Helper candidates for common tags
  const revenueTags = ["Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerExcludingAssessedTax"];
  const netIncomeTags = ["NetIncomeLoss", "ProfitLoss"];
  const epsTags = ["EarningsPerShareBasic", "EarningsPerShareDiluted", "EarningsPerShareBasicContinuousOperations"];
  const shareholdersEquityTags = ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"];
  const commonSharesTags = ["CommonStockSharesOutstanding", "EntityCommonStockSharesOutstanding"];
  const intangibleTags = ["Goodwill", "IntangibleAssets" , "IntangibleAssetsNet"];
  const totalDebtTags = ["Debt", "LongTermDebt", "LiabilitiesNoncurrent"];
  const ebitdaTags = ["EarningsBeforeInterestTaxesDepreciationAndAmortization", "Ebitdar"];

  const revenueTtm = computeTTM(facts, revenueTags);
  const netIncomeTtm = computeTTM(facts, netIncomeTags);

  const epsLatest = getLatestFactValue(facts, epsTags);
  const epsTtm = epsLatest.value; // EPS TTM best-effort from EPS tag (many filers don't report TTM EPS via companyfacts)

  const shareholdersEquity = getLatestFactValue(facts, shareholdersEquityTags);
  const totalDebt = getLatestFactValue(facts, totalDebtTags);
  const cashAndEquivalents = getLatestFactValue(facts, ["CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsPeriodEnd"]);

  const commonShares = getLatestFactValue(facts, commonSharesTags);

  // book value per share
  const bookValue = shareholdersEquity.value;
  const bookValuePerShare = (bookValue !== null && commonShares.value) ? bookValue / commonShares.value : null;

  // tangible book value = shareholdersEquity - intangible assets
  const intangible = getLatestFactValue(facts, intangibleTags);
  const tangibleBookValue = (bookValue !== null) ? (bookValue - (intangible.value ?? 0)) : null;
  const tangibleBookValuePerShare = (tangibleBookValue !== null && commonShares.value) ? tangibleBookValue / commonShares.value : null;

  // ebitda
  const ebitdaVal = getLatestFactValue(facts, ebitdaTags);

  // revenue and net income pick values & asOf
  const revenueVal = revenueTtm.value !== null ? revenueTtm.value : getLatestFactValue(facts, revenueTags).value;
  const revenueAsOf = revenueTtm.asOf ?? getLatestFactValue(facts, revenueTags).asOf;

  const netIncomeVal = netIncomeTtm.value !== null ? netIncomeTtm.value : getLatestFactValue(facts, netIncomeTags).value;
  const netIncomeAsOf = netIncomeTtm.asOf ?? getLatestFactValue(facts, netIncomeTags).asOf;

  return {
    revenue: getLatestFactValue(facts, revenueTags).value,
    revenueTtm: revenueVal,
    revenueAsOf,
    grossProfit: getLatestFactValue(facts, ["GrossProfit"]).value,
    operatingIncome: getLatestFactValue(facts, ["OperatingIncomeLoss"]).value,
    netIncome: getLatestFactValue(facts, netIncomeTags).value,
    netIncomeTtm: netIncomeVal,
    netIncomeAsOf,
    eps: epsLatest.value,
    epsTtm,
    peNtm: null,
    peLtm: null,
    bookValue,
    bookValuePerShare,
    tangibleBookValue,
    tangibleBookValuePerShare,
    enterpriseValue: null,
    ebitda: ebitdaVal.value,
    totalDebt: totalDebt.value,
    cashAndEquivalents: cashAndEquivalents.value,
    totalAssets: getLatestFactValue(facts, ["Assets"]).value,
    totalLiabilities: getLatestFactValue(facts, ["Liabilities"]).value,
    shareholdersEquity: shareholdersEquity.value,
    filingDate: revenueAsOf || netIncomeAsOf || undefined,
    fiscalYear: undefined,
    fiscalPeriod: undefined,
    commonSharesOutstanding: commonShares.value,
    source: "SEC_EDGAR",
    rawFacts: facts,
  };
}

export { fetchCompanyFacts };
