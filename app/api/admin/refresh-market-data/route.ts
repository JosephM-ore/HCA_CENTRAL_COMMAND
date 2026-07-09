import { NextResponse } from "next/server";
import { refreshMarketData } from "@/lib/market-data/refresh-market-data-service";

export async function POST() {
  try {
    const result = await refreshMarketData({
      trigger: "MANUAL",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Finnhub current price refresh failed.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}