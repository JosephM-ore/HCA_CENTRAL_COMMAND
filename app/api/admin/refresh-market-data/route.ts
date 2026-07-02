import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFmpMarketData } from "@/lib/fmp";
import { calculateValuationMetrics } from "@/lib/market-calculations";

function mergeNumber(
  freshValue: number | null | undefined,
  existingValue: number | null | undefined
) {
  return freshValue ?? existingValue ?? null;
}

export async function POST() {
  const ingestionRun = await prisma.ingestionRun.create({
    data: {
      source: "FMP",
      status: "STARTED",
      message: "FMP market data refresh started.",
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
        const fmpData = await getFmpMarketData(security.ticker);

        const mergedBase = {
          currentPrice: mergeNumber(fmpData.currentPrice, existingMarketData?.currentPrice),
          marketCap: mergeNumber(fmpData.marketCap, existingMarketData?.marketCap),
          epsTtm: existingMarketData?.epsTtm ?? null,
          bookValuePerShare: existingMarketData?.bookValuePerShare ?? null,
          tangibleBookValuePerShare: existingMarketData?.tangibleBookValuePerShare ?? null,
          totalDebt: existingMarketData?.totalDebt ?? null,
          cashAndEquivalents: existingMarketData?.cashAndEquivalents ?? null,
          ebitda: existingMarketData?.ebitda ?? null,
        };

        const calculated = calculateValuationMetrics(mergedBase);
        const hasCalculated = Object.values(calculated).some((value) => value !== null);

        const data = {
          currentPrice: mergedBase.currentPrice,
          vwap: mergeNumber(fmpData.vwap, existingMarketData?.vwap),
          high52w: mergeNumber(fmpData.high52w, existingMarketData?.high52w),
          low52w: mergeNumber(fmpData.low52w, existingMarketData?.low52w),
          beta: mergeNumber(fmpData.beta, existingMarketData?.beta),
          avgVolume: mergeNumber(fmpData.avgVolume, existingMarketData?.avgVolume),
          shortFloat: fmpData.shortFloat ?? null,
          marketCap: mergedBase.marketCap,
          peLtm: calculated.peLtm ?? mergeNumber(fmpData.peLtm, existingMarketData?.peLtm),
          priceToTangBook: calculated.priceToTangBook ?? mergeNumber(fmpData.priceToTangBook, existingMarketData?.priceToTangBook),
          peNtm: fmpData.peNtm ?? null,
          priceToBook: calculated.priceToBook ?? mergeNumber(fmpData.priceToBook, existingMarketData?.priceToBook),
          debtToEbitda: calculated.debtToEbitda ?? mergeNumber(fmpData.debtToEbitda, existingMarketData?.debtToEbitda),
          eps: mergeNumber(fmpData.eps, existingMarketData?.eps),
          enterpriseValue: calculated.enterpriseValue ?? existingMarketData?.enterpriseValue ?? null,
          volume: null,
          sharesOutstanding: null,
          floatShares: null,
          shortInterestShares: null,
          epsNtm: null,
          source: "FMP",
          marketDataSource: "FMP",
          fundamentalsSource: existingMarketData?.fundamentalsSource ?? null,
          dataQuality: hasCalculated ? "CALCULATED" : existingMarketData?.dataQuality ?? null,
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
        });

        // Gentle delay for free-tier rate limits.
        await new Promise((resolve) => setTimeout(resolve, 250));
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
        message: `FMP refresh complete. Updated: ${updatedCount}. Failed: ${failedCount}. Failed tickers are using cached fallback values.`,
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
