-- AlterTable
ALTER TABLE "Flag" ADD COLUMN "metadataJson" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "securityId" TEXT,
    "positionId" TEXT,
    "watchlistEntryId" TEXT,
    "authorId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_watchlistEntryId_fkey" FOREIGN KEY ("watchlistEntryId") REFERENCES "WatchlistEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("archivedAt", "authorId", "content", "createdAt", "id", "isPinned", "positionId", "securityId", "tag", "updatedAt", "watchlistEntryId") SELECT "archivedAt", "authorId", "content", "createdAt", "id", "isPinned", "positionId", "securityId", "tag", "updatedAt", "watchlistEntryId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "securityId" TEXT NOT NULL,
    "positionId" TEXT,
    "dateTraded" DATETIME NOT NULL,
    "shares" REAL NOT NULL,
    "avgPrice" REAL NOT NULL,
    "tradeType" TEXT,
    "settlementDate" DATETIME,
    "postDate" DATETIME,
    "notional" REAL,
    "commission" REAL,
    "fees" REAL,
    "accruedInterest" REAL,
    "netAmount" REAL,
    "currency" TEXT,
    "transactionId" TEXT,
    "clientReferenceId" TEXT,
    "source" TEXT,
    "sourceFileName" TEXT,
    "sourceRowHash" TEXT,
    "sourceReportDate" DATETIME,
    "ingestionRunId" TEXT,
    "ptHistory" TEXT,
    "comment" TEXT,
    "reconciliationStatus" TEXT,
    "reconciliationGroupId" TEXT,
    "matchedTradeId" TEXT,
    "reconciledAt" DATETIME,
    "reconciliationNotes" TEXT,
    "manualEnteredById" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("accruedInterest", "avgPrice", "clientReferenceId", "comment", "commission", "createdAt", "currency", "dateTraded", "fees", "id", "ingestionRunId", "netAmount", "notional", "positionId", "postDate", "ptHistory", "securityId", "settlementDate", "shares", "source", "sourceFileName", "sourceReportDate", "sourceRowHash", "tradeType", "transactionId") SELECT "accruedInterest", "avgPrice", "clientReferenceId", "comment", "commission", "createdAt", "currency", "dateTraded", "fees", "id", "ingestionRunId", "netAmount", "notional", "positionId", "postDate", "ptHistory", "securityId", "settlementDate", "shares", "source", "sourceFileName", "sourceReportDate", "sourceRowHash", "tradeType", "transactionId" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
