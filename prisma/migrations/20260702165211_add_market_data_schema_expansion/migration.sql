-- AlterTable
ALTER TABLE "MarketDataCache" ADD COLUMN "bookValue" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "bookValuePerShare" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "cashAndEquivalents" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "dataQuality" TEXT;
ALTER TABLE "MarketDataCache" ADD COLUMN "dayChange" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "dayPctChange" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "ebitda" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "enterpriseValue" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "epsNtm" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "epsTtm" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "floatShares" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "fundamentalsAsOf" DATETIME;
ALTER TABLE "MarketDataCache" ADD COLUMN "fundamentalsSource" TEXT;
ALTER TABLE "MarketDataCache" ADD COLUMN "grossProfit" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "lastFundamentalsRefreshAt" DATETIME;
ALTER TABLE "MarketDataCache" ADD COLUMN "lastMarketDataRefreshAt" DATETIME;
ALTER TABLE "MarketDataCache" ADD COLUMN "lastShortInterestRefreshAt" DATETIME;
ALTER TABLE "MarketDataCache" ADD COLUMN "marketDataSource" TEXT;
ALTER TABLE "MarketDataCache" ADD COLUMN "netIncome" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "netIncomeTtm" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "operatingIncome" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "revenue" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "revenueTtm" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "shareholdersEquity" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "sharesOutstanding" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "shortInterestAsOf" DATETIME;
ALTER TABLE "MarketDataCache" ADD COLUMN "shortInterestShares" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "shortInterestSource" TEXT;
ALTER TABLE "MarketDataCache" ADD COLUMN "snapshotAsOf" DATETIME;
ALTER TABLE "MarketDataCache" ADD COLUMN "sourceDetailJson" TEXT;
ALTER TABLE "MarketDataCache" ADD COLUMN "tangibleBookValue" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "tangibleBookValuePerShare" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "totalAssets" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "totalDebt" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "totalLiabilities" REAL;
ALTER TABLE "MarketDataCache" ADD COLUMN "volume" REAL;

-- AlterTable
ALTER TABLE "Security" ADD COLUMN "cik" TEXT;
ALTER TABLE "Security" ADD COLUMN "exchange" TEXT;
ALTER TABLE "Security" ADD COLUMN "industry" TEXT;
ALTER TABLE "Security" ADD COLUMN "securityType" TEXT;

-- CreateIndex
CREATE INDEX "MarketDataCache_securityId_idx" ON "MarketDataCache"("securityId");

-- CreateIndex
CREATE INDEX "MarketDataCache_updatedAt_idx" ON "MarketDataCache"("updatedAt");

-- CreateIndex
CREATE INDEX "Security_cik_idx" ON "Security"("cik");
