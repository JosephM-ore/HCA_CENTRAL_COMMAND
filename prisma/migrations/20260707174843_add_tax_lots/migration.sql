-- CreateTable
CREATE TABLE "TaxLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "securityId" TEXT NOT NULL,
    "positionId" TEXT,
    "accountNumber" TEXT,
    "taxLotId" TEXT,
    "taxLotDate" DATETIME,
    "quantity" REAL,
    "unitCost" REAL,
    "marketPrice" REAL,
    "costBasis" REAL,
    "marketValue" REAL,
    "unrealizedPnl" REAL,
    "roi" REAL,
    "holdingPeriod" TEXT,
    "daysToLongTerm" TEXT,
    "source" TEXT,
    "sourceFileName" TEXT,
    "sourceRowHash" TEXT NOT NULL,
    "sourceReportDate" DATETIME,
    "ingestionRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxLot_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaxLot_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxLot_sourceRowHash_key" ON "TaxLot"("sourceRowHash");

-- CreateIndex
CREATE INDEX "TaxLot_securityId_idx" ON "TaxLot"("securityId");

-- CreateIndex
CREATE INDEX "TaxLot_positionId_idx" ON "TaxLot"("positionId");

-- CreateIndex
CREATE INDEX "TaxLot_taxLotDate_idx" ON "TaxLot"("taxLotDate");

-- CreateIndex
CREATE INDEX "TaxLot_sourceReportDate_idx" ON "TaxLot"("sourceReportDate");
