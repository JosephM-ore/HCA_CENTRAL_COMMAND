-- AlterTable
ALTER TABLE "IngestionRun" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "IngestionRun" ADD COLUMN "detailsJson" TEXT;
ALTER TABLE "IngestionRun" ADD COLUMN "fileHash" TEXT;
ALTER TABLE "IngestionRun" ADD COLUMN "fileName" TEXT;
ALTER TABLE "IngestionRun" ADD COLUMN "fileType" TEXT;
ALTER TABLE "IngestionRun" ADD COLUMN "rowsFailed" INTEGER;
ALTER TABLE "IngestionRun" ADD COLUMN "rowsProcessed" INTEGER;
ALTER TABLE "IngestionRun" ADD COLUMN "sourceReportDate" DATETIME;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "Position" ADD COLUMN "costBasis" REAL;
ALTER TABLE "Position" ADD COLUMN "custodian" TEXT;
ALTER TABLE "Position" ADD COLUMN "ingestionRunId" TEXT;
ALTER TABLE "Position" ADD COLUMN "source" TEXT;
ALTER TABLE "Position" ADD COLUMN "sourceFileName" TEXT;
ALTER TABLE "Position" ADD COLUMN "sourceReportDate" DATETIME;
ALTER TABLE "Position" ADD COLUMN "sourceRowHash" TEXT;
ALTER TABLE "Position" ADD COLUMN "unrealizedPnl" REAL;

-- AlterTable
ALTER TABLE "Security" ADD COLUMN "cusip" TEXT;
ALTER TABLE "Security" ADD COLUMN "isin" TEXT;
ALTER TABLE "Security" ADD COLUMN "sedol" TEXT;
ALTER TABLE "Security" ADD COLUMN "wellsSecurityId" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "accruedInterest" REAL;
ALTER TABLE "Trade" ADD COLUMN "clientReferenceId" TEXT;
ALTER TABLE "Trade" ADD COLUMN "commission" REAL;
ALTER TABLE "Trade" ADD COLUMN "currency" TEXT;
ALTER TABLE "Trade" ADD COLUMN "fees" REAL;
ALTER TABLE "Trade" ADD COLUMN "ingestionRunId" TEXT;
ALTER TABLE "Trade" ADD COLUMN "netAmount" REAL;
ALTER TABLE "Trade" ADD COLUMN "notional" REAL;
ALTER TABLE "Trade" ADD COLUMN "postDate" DATETIME;
ALTER TABLE "Trade" ADD COLUMN "settlementDate" DATETIME;
ALTER TABLE "Trade" ADD COLUMN "source" TEXT;
ALTER TABLE "Trade" ADD COLUMN "sourceFileName" TEXT;
ALTER TABLE "Trade" ADD COLUMN "sourceReportDate" DATETIME;
ALTER TABLE "Trade" ADD COLUMN "sourceRowHash" TEXT;
ALTER TABLE "Trade" ADD COLUMN "tradeType" TEXT;
ALTER TABLE "Trade" ADD COLUMN "transactionId" TEXT;
