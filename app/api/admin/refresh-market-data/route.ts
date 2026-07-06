import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchFinnhubQuote } from "@/lib/market-data/finnhub";

export async function POST() {
  const ingestionRun = await prisma.ingestionRun.create({
    data: {
      source: "FINNHUB",
      status: "STARTED",
      message: "Finnhub current price refresh started.",
    },
  });

  try {
    let securities = await prisma.security.findMany({
      where: {
        positions: {
          some: {
            status: "ACTIVE",
            source: "WELLS_FARGO",
          },
        },
      },
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

    // Fallback for dev/seeded mode if no Wells positions exist.
    if (securities.length === 0) {
      securities = await prisma.security.findMany({
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
    }

    const results: Array<{
      ticker: string;
      status: "UPDATED" | "FAILED";
      message?: string;
    }> = [];

    for (const security of securities) {
      try {
        const existingMarketData = security.marketData[0] ?? null;
        const quote = await fetchFinnhubQuote(security.ticker);

        if (!quote) {
          results.push({
            ticker: security.ticker,
            status: "FAILED",
            message: "No Finnhub current price returned.",
          });

          await new Promise((resolve) => setTimeout(resolve, 1100));
          continue;
        }

        const data = {
          currentPrice: quote.currentPrice,
          dayChange: quote.dayChange,
          dayPctChange: quote.dayPctChange,
          source: "FINNHUB",
          marketDataSource: "FINNHUB",
          dataQuality: "REAL",
          lastMarketDataRefreshAt: new Date(),
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

        // Finnhub free tier is 60 calls/minute, so stay under that.
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

    const updatedCount = results.filter(
      (result) => result.status === "UPDATED"
    ).length;

    const failedCount = results.filter(
      (result) => result.status === "FAILED"
    ).length;

    await prisma.ingestionRun.update({
      where: {
        id: ingestionRun.id,
      },
      data: {
        status: failedCount > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
        message: `Finnhub current price refresh complete. Updated: ${updatedCount}. Failed: ${failedCount}.`,
        endedAt: new Date(),
        rowsProcessed: results.length,
        rowsFailed: failedCount,
      },
    });

    return NextResponse.json({
      source: "FINNHUB",
      updatedCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("Finnhub current price refresh failed:", error);

    await prisma.ingestionRun.update({
      where: {
        id: ingestionRun.id,
      },
      data: {
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown Finnhub refresh failure.",
        endedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        error: "Finnhub current price refresh failed.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}