-- AlterTable
ALTER TABLE "WatchlistEntry" ADD COLUMN "entryTargetPrice" REAL;
ALTER TABLE "WatchlistEntry" ADD COLUMN "exitTargetPrice" REAL;

-- CreateTable
CREATE TABLE "RegistrationApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT NOT NULL,
    "registeredUserId" TEXT,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegistrationApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegistrationApproval_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationApproval_email_key" ON "RegistrationApproval"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationApproval_registeredUserId_key" ON "RegistrationApproval"("registeredUserId");

-- CreateIndex
CREATE INDEX "RegistrationApproval_status_idx" ON "RegistrationApproval"("status");

-- CreateIndex
CREATE INDEX "RegistrationApproval_approvedById_idx" ON "RegistrationApproval"("approvedById");
