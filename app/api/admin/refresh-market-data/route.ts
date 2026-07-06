import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFmpMarketData } from "@/lib/fmp";
import { calculateValuationMetrics } from "@/lib/market-calculations";
import { fetchFinnhubQuote } from "@/lib/market-data/finnhub";

function mergeNumber(
  freshValue: number | null | undefined,
  existingValue: number | null | undefined
) {
  return freshValue ?? existingValue ?? null;
}

export async function POST() {
  const ingestionRun = await prisma.ingestionRun.create({
    data: {

      source: "MARKET_DATA",
      status: "STARTED",
      message: "Market data refresh started.",

    },
  });

  try {
    const securities = await prisma.security.findMany({
      orderBy: {
        ticker: "asc",
      },
      include: {
        marketData: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
    });

    const results: Array<{
      ticker: string;
      status: "UPDATED" | "FAILED";
      message?: string;
    }> = [];

    
for (const security of securities) {
    try {
      const existingMarketData = security.marketData[0] ?? null;

      let finnhubQuote = null;
      let fmpData = null;
      let fmpError: string | null = null;

      try {
        finnhubQuote = await fetchFinnhubQuote(security.ticker);
      } catch (error) {
        console.error(`Finnhub quote failed for ${security.ticker}:`, error);
      }

      try {
        fmpData = await getFmpMarketData(security.ticker);
      } catch (error) {
        fmpError = error instanceof Error ? error.message : "Unknown FMP error";
        console.error(`FMP enrichment failed for ${security.ticker}:`, error);
      }

      const currentPrice = mergeNumber(
        finnhubQuote?.currentPrice,
        mergeNumber(fmpData?.currentPrice, existingMarketData?.currentPrice)
      );

      const marketDataSource =
        finnhubQuote?.currentPrice != null
          ? "FINNHUB"
          : fmpData?.currentPrice != null
            ? "FMP"
            : existingMarketData?.marketDataSource ?? null;

      const source = marketDataSource ?? existingMarketData?.source ?? "MARKET_DATA";

      const mergedBase = {
        currentPrice,
        marketCap: mergeNumber(fmpData?.marketCap, existingMarketData?.marketCap),
        epsTtm: existingMarketData?.epsTtm ?? null,
        bookValuePerShare: existingMarketData?.bookValuePerShare ?? null,
        tangibleBookValuePerShare:
          existingMarketData?.tangibleBookValuePerShare ?? null,
        totalDebt: existingMarketData?.totalDebt ?? null,
        cashAndEquivalents: existingMarketData?.cashAndEquivalents ?? null,
        ebitda: existingMarketData?.ebitda ?? null,
      };

      const calculated = calculateValuationMetrics(mergedBase);
      const hasCalculated = Object.values(calculated).some(
        (value) => value !== null
      );

      const data = {
        currentPrice: mergedBase.currentPrice,
        vwap: mergeNumber(fmpData?.vwap, existingMarketData?.vwap),
        high52w: mergeNumber(fmpData?.high52w, existingMarketData?.high52w),
        low52w: mergeNumber(fmpData?.low52w, existingMarketData?.low52w),
        beta: mergeNumber(fmpData?.beta, existingMarketData?.beta),
        avgVolume: mergeNumber(fmpData?.avgVolume, existingMarketData?.avgVolume),
        shortFloat: fmpData?.shortFloat ?? existingMarketData?.shortFloat ?? null,
        marketCap: mergedBase.marketCap,
        peLtm:
          calculated.peLtm ??
          mergeNumber(fmpData?.peLtm, existingMarketData?.peLtm),
        priceToTangBook:
          calculated.priceToTangBook ??
          mergeNumber(
            fmpData?.priceToTangBook,
            existingMarketData?.priceToTangBook
          ),
        peNtm: fmpData?.peNtm ?? existingMarketData?.peNtm ?? null,
        priceToBook:
          calculated.priceToBook ??
          mergeNumber(fmpData?.priceToBook, existingMarketData?.priceToBook),
        debtToEbitda:
          calculated.debtToEbitda ??
          mergeNumber(fmpData?.debtToEbitda, existingMarketData?.debtToEbitda),
        eps: mergeNumber(fmpData?.eps, existingMarketData?.eps),
        enterpriseValue:
          calculated.enterpriseValue ??
          existingMarketData?.enterpriseValue ??
          null,
        volume: existingMarketData?.volume ?? null,
        sharesOutstanding: existingMarketData?.sharesOutstanding ?? null,
        floatShares: existingMarketData?.floatShares ?? null,
        shortInterestShares: existingMarketData?.shortInterestShares ?? null,
        epsNtm: existingMarketData?.epsNtm ?? null,
        source,
        marketDataSource,
        fundamentalsSource: existingMarketData?.fundamentalsSource ?? null,
        dataQuality:
          finnhubQuote?.currentPrice != null
            ? "REAL"
            : hasCalculated
              ? "CALCULATED"
              : existingMarketData?.dataQuality ?? null,
      };

      if (existingMarketData) {
        await prisma.marketDataCache.update({
          where: {
            id: existingMarketData.id,
          },
          data,
        });
      } else {
        await prisma.marketDataCache.create({
          data: {
            securityId: security.id,
            ...data,
          },
        });
      }

      results.push({
        ticker: security.ticker,
        status: "UPDATED",
        message: fmpError
          ? `Finnhub current price saved. FMP enrichment failed: ${fmpError}`
          : undefined,
      });

      await new Promise((resolve) => setTimeout(resolve, 1100));
    } catch (error) {
      console.error(`Failed to update ${security.ticker}:`, error);

      results.push({
        ticker: security.ticker,
        status: "FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }


    const updatedCount = results.filter((result) => result.status === "UPDATED").length;
    const failedCount = results.filter((result) => result.status === "FAILED").length;

    await prisma.ingestionRun.update({
      where: {
        id: ingestionRun.id,
      },
      data: {

        status: failedCount > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
        message: `Market data refresh complete. Updated: ${updatedCount}. Failed: ${failedCount}. Failed tickers are using cached fallback values.`,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      source: "FMP",
      updatedCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("FMP market data refresh failed:", error);

    await prisma.ingestionRun.update({
      where: {
        id: ingestionRun.id,
      },
      data: {
        status: "FAILED",
        message: error instanceof Error ? error.message : "Unknown FMP refresh failure.",
        endedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        error: "FMP market data refresh failed.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
