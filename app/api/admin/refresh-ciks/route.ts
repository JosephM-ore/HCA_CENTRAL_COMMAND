import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSecCikForTicker } from "@/lib/sec";

export async function POST() {
  const ingestionRun = await prisma.ingestionRun.create({
    data: {
      source: "SEC_CIK",
      status: "STARTED",
      message: "SEC CIK refresh started.",
    },
  });

  try {
    const securities = await prisma.security.findMany({
      orderBy: { ticker: "asc" },
    });

    const results: Array<{
      ticker: string;
      status: "UPDATED" | "SKIPPED" | "FAILED";
      message?: string;
      cik?: string | null;
    }> = [];

    let updatedCount = 0;
    let failedCount = 0;

    for (const security of securities) {
      try {
        if (security.cik) {
          results.push({ ticker: security.ticker, status: "SKIPPED", message: "Existing CIK preserved.", cik: security.cik });
          continue;
        }

        const resolvedCik = await resolveSecCikForTicker(security.ticker);
        if (!resolvedCik) {
          failedCount += 1;
          results.push({ ticker: security.ticker, status: "FAILED", message: "Ticker not found in SEC mapping.", cik: null });
          continue;
        }

        await prisma.security.update({
          where: { id: security.id },
          data: { cik: resolvedCik },
        });

        updatedCount += 1;
        results.push({ ticker: security.ticker, status: "UPDATED", cik: resolvedCik });
      } catch (error) {
        failedCount += 1;
        console.error(`Failed to resolve CIK for ${security.ticker}:`, error);
        results.push({ ticker: security.ticker, status: "FAILED", message: error instanceof Error ? error.message : "Unknown error", cik: security.cik ?? null });
      }
    }

    await prisma.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: failedCount > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
        message: `SEC CIK refresh complete. Updated: ${updatedCount}. Failed: ${failedCount}.`,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      source: "SEC_CIK",
      updatedCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("SEC CIK refresh failed:", error);
    await prisma.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: "FAILED",
        message: error instanceof Error ? error.message : "Unknown SEC CIK refresh failure.",
        endedAt: new Date(),
      },
    });
    return NextResponse.json(
      { error: "SEC CIK refresh failed.", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
