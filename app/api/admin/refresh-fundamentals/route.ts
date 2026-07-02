import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSecFundamentals } from "@/lib/sec";

function mergeNumber(freshValue: number | null | undefined, existingValue: number | null | undefined) {
  return freshValue ?? existingValue ?? null;
}

export async function POST() {
  const ingestionRun = await prisma.ingestionRun.create({
    data: {
      source: "SEC_EDGAR",
      status: "STARTED",
      message: "SEC fundamentals refresh started.",
    },
  });

  try {
    const securities = await prisma.security.findMany({
      orderBy: { ticker: "asc" },
      include: {
        marketData: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });

    const results: Array<{ ticker: string; status: "UPDATED" | "FAILED"; message?: string }> = [];

    for (const security of securities) {
      try {
        const existingMarketData = security.marketData[0] ?? null;

        const cik = security.cik;
        if (!cik) {
          results.push({ ticker: security.ticker, status: "FAILED", message: "Missing CIK" });
          continue;
        }

        const secData = await getSecFundamentals(cik);

        // compute enterpriseValue if possible
        const marketCap = existingMarketData?.marketCap ?? null;
        const totalDebt = secData.totalDebt ?? existingMarketData?.debtToEbitda ?? secData.totalDebt ?? null;
        const cash = secData.cashAndEquivalents ?? existingMarketData?.eps ?? null;

        const enterpriseValue = marketCap != null && (totalDebt != null || cash != null)
          ? (marketCap + (totalDebt ?? 0) - (cash ?? 0))
          : null;

        const data = {
          // fundamentals
          epsTtm: mergeNumber(secData.epsTtm, existingMarketData?.epsTtm),
          bookValue: mergeNumber(secData.bookValue, existingMarketData?.bookValue),
          bookValuePerShare: mergeNumber(secData.bookValuePerShare, existingMarketData?.bookValuePerShare),
          tangibleBookValue: mergeNumber(secData.tangibleBookValue, existingMarketData?.tangibleBookValue),
          tangibleBookValuePerShare: mergeNumber(secData.tangibleBookValuePerShare, existingMarketData?.tangibleBookValuePerShare),

          revenue: mergeNumber(secData.revenue, existingMarketData?.revenue),
          revenueTtm: mergeNumber(secData.revenueTtm, existingMarketData?.revenueTtm),
          grossProfit: mergeNumber(secData.grossProfit, existingMarketData?.grossProfit),
          operatingIncome: mergeNumber(secData.operatingIncome, existingMarketData?.operatingIncome),
          netIncome: mergeNumber(secData.netIncome, existingMarketData?.netIncome),
          netIncomeTtm: mergeNumber(secData.netIncomeTtm, existingMarketData?.netIncomeTtm),

          ebitda: mergeNumber(secData.ebitda, existingMarketData?.ebitda),
          totalDebt: mergeNumber(secData.totalDebt, existingMarketData?.totalDebt),
          cashAndEquivalents: mergeNumber(secData.cashAndEquivalents, existingMarketData?.cashAndEquivalents),
          totalAssets: mergeNumber(secData.totalAssets, existingMarketData?.totalAssets),
          totalLiabilities: mergeNumber(secData.totalLiabilities, existingMarketData?.totalLiabilities),
          shareholdersEquity: mergeNumber(secData.shareholdersEquity, existingMarketData?.shareholdersEquity),

          enterpriseValue: mergeNumber(enterpriseValue, existingMarketData?.enterpriseValue),

          // provenance
          fundamentalsSource: "SEC_EDGAR",
          fundamentalsAsOf: secData.filingDate ? new Date(secData.filingDate) : new Date(),
          lastFundamentalsRefreshAt: new Date(),
        } as any;

        if (existingMarketData) {
          await prisma.marketDataCache.update({ where: { id: existingMarketData.id }, data });
        } else {
          await prisma.marketDataCache.create({ data: { securityId: security.id, ...data } });
        }

        results.push({ ticker: security.ticker, status: "UPDATED" });

        // gentle delay
        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        console.error(`Failed to update fundamentals for ${security.ticker}:`, error);
        results.push({ ticker: security.ticker, status: "FAILED", message: error instanceof Error ? error.message : "Unknown" });
      }
    }

    const updatedCount = results.filter((r) => r.status === "UPDATED").length;
    const failedCount = results.filter((r) => r.status === "FAILED").length;

    await prisma.ingestionRun.update({ where: { id: ingestionRun.id }, data: { status: failedCount > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED", message: `SEC fundamentals refresh complete. Updated: ${updatedCount}. Failed: ${failedCount}.`, endedAt: new Date() } });

    return NextResponse.json({ source: "SEC_EDGAR", updatedCount, failedCount, results });
  } catch (error) {
    console.error("SEC fundamentals refresh failed:", error);
    await prisma.ingestionRun.update({ where: { id: ingestionRun.id }, data: { status: "FAILED", message: error instanceof Error ? error.message : "Unknown SEC refresh failure.", endedAt: new Date() } });
    return NextResponse.json({ error: "SEC fundamentals refresh failed.", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
