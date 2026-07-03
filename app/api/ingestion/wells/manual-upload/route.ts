import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectWellsReportType } from "@/lib/ingestion/wells-detect-report";
import { parseWellsTaxLotCsv } from "@/lib/ingestion/wells-tax-lot";
import { parseWellsTransactionActivityCsv } from "@/lib/ingestion/wells-transaction-activity";

async function bufferToString(buffer: ArrayBuffer): Promise<string> {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

function normalizeFilename(filename: string): string {
  return filename.replace(/\s+/g, "_").trim();
}

function rowsToSummary(rows: any[]) {
  return rows.length;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const fileName = normalizeFilename(file.name);
    const fileType = file.type || "text/csv";
    const rawContent = await file.text();
    const reportType = detectWellsReportType(rawContent);

    const ingestionRun = await prisma.ingestionRun.create({
      data: {
        source: "WELLS_FARGO",
        status: "STARTED",
        message: `Wells Fargo ingestion started for ${fileName}`,
        fileName,
        fileType,
      },
    });

    if (reportType === "UNKNOWN") {
      await prisma.ingestionRun.update({ where: { id: ingestionRun.id }, data: { status: "FAILED", message: "Unrecognized Wells report type.", endedAt: new Date() } });
      return NextResponse.json({ error: "Unrecognized Wells report type.", reportType }, { status: 400 });
    }

    if (reportType === "CHANGE_IN_EQUITY_PERFORMANCE" || reportType === "PORTFOLIO_RISK_EXPOSURE") {
      await prisma.ingestionRun.update({ where: { id: ingestionRun.id }, data: { status: "COMPLETED", message: `Detected report type ${reportType}, ingestion not implemented.`, endedAt: new Date() } });
      return NextResponse.json({ source: "WELLS_FARGO", reportType, message: "NOT_IMPLEMENTED_FOR_THIS_REPORT_TYPE" }, { status: 200 });
    }

    let rowsProcessed = 0;
    let rowsFailed = 0;
    let securitiesCreated = 0;
    let securitiesUpdated = 0;
    let positionsCreated = 0;
    let positionsUpdated = 0;
    let tradesCreated = 0;
    let tradesUpdated = 0;
    const failures: string[] = [];

    const sourceReportDate = new Date();
    const sourceRowHashBase = fileName;

    if (reportType === "TAX_LOT_POSITION_PNL") {
      const { rows, positions, failures: parseFailures } = parseWellsTaxLotCsv(rawContent, fileName);
      rowsFailed += parseFailures.length;
      failures.push(...parseFailures);
      rowsProcessed += rows.length;

      for (const position of positions) {
        if (!position.accountNumber) {
          failures.push(`Missing accountNumber for aggregated position ${position.securityName}`);
          rowsFailed += 1;
          continue;
        }

        let security = null;
        if (position.ticker) {
          security = await prisma.security.findUnique({ where: { ticker: position.ticker } });
        }

        if (!security) {
          security = await prisma.security.create({
            data: {
              ticker: position.ticker || position.securityName,
              name: position.securityName,
              wellsSecurityId: undefined,
              cusip: undefined,
              isin: undefined,
              sedol: undefined,
            },
          });
          securitiesCreated += 1;
        } else {
          securitiesUpdated += 1;
        }

        const positionData = {
          securityId: security.id,
          source: "WELLS_FARGO",
          accountNumber: position.accountNumber,
          custodian: "Wells Fargo",
          costBasis: position.costBasis,
          unrealizedPnl: position.unrealizedPnl,
          sourceReportDate: position.sourceReportDate ? new Date(position.sourceReportDate) : sourceReportDate,
          sourceFileName: position.sourceFileName,
          sourceRowHash: position.sourceRowHash,
          ingestionRunId: ingestionRun.id,
          side: position.side,
          status: "ACTIVE",
          shares: position.shares,
          marketValue: position.marketValue,
          wap: position.wap,
          openedAt: position.openedAt ? new Date(position.openedAt) : undefined,
        };

        const existingPosition = await prisma.position.findFirst({ where: { securityId: security.id, accountNumber: position.accountNumber, status: "ACTIVE" } });
        if (existingPosition) {
          await prisma.position.update({ where: { id: existingPosition.id }, data: positionData });
          positionsUpdated += 1;
        } else {
          await prisma.position.create({ data: positionData });
          positionsCreated += 1;
        }
      }
    }

    if (reportType === "TRANSACTION_ACTIVITY") {
      const { rows, failures: parseFailures } = parseWellsTransactionActivityCsv(rawContent, fileName);
      rowsFailed += parseFailures.length;
      failures.push(...parseFailures);
      rowsProcessed += rows.length;

      for (const row of rows) {
        if (!row.accountNumber) {
          failures.push(`Missing accountNumber for row ${row.sourceRowHash}`);
          rowsFailed += 1;
          continue;
        }

        if (!row.securityName && !row.ticker) {
          failures.push(`Missing securityName/ticker for row ${row.sourceRowHash}`);
          rowsFailed += 1;
          continue;
        }

        const tradeType = row.tradeType || "UNSUPPORTED";
        if (tradeType === "UNSUPPORTED") {
          failures.push(`Unsupported activity '${row.activity}' for row ${row.sourceRowHash}`);
          rowsFailed += 1;
          continue;
        }

        let security = null;
        if (row.ticker) {
          security = await prisma.security.findUnique({ where: { ticker: row.ticker } });
        }

        if (!security) {
          security = await prisma.security.create({
            data: {
              ticker: row.ticker || row.securityName || "UNKNOWN",
              name: row.securityName || row.ticker || "UNKNOWN",
              wellsSecurityId: row.wfSecId,
              cusip: row.cusip,
              isin: row.isin,
              sedol: row.sedol,
            },
          });
          securitiesCreated += 1;
        } else {
          securitiesUpdated += 1;
        }

        const lookupTransactionId = row.transactionId || row.sourceRowHash;

        const tradeData = {
          securityId: security.id,
          dateTraded: row.tradeDate ? new Date(row.tradeDate) : new Date(),
          settlementDate: row.settlementDate ? new Date(row.settlementDate) : undefined,
          postDate: row.postDate ? new Date(row.postDate) : undefined,
          tradeType,
          shares: row.quantity ?? 0,
          avgPrice: row.price ?? 0,
          commission: row.commission,
          fees: row.fees,
          accruedInterest: row.accruedInterest,
          netAmount: row.netAmount,
          currency: row.currency,
          transactionId: row.transactionId,
          clientReferenceId: row.clientReferenceId,
          source: "WELLS_FARGO",
          sourceFileName: row.sourceFileName,
          sourceRowHash: row.sourceRowHash,
          sourceReportDate: row.sourceReportDate ? new Date(row.sourceReportDate) : sourceReportDate,
          ingestionRunId: ingestionRun.id,
          comment: undefined,
        };

        const existingTrade = row.transactionId
          ? await prisma.trade.findFirst({ where: { transactionId: row.transactionId } })
          : await prisma.trade.findFirst({ where: { sourceRowHash: row.sourceRowHash } });

        if (existingTrade) {
          await prisma.trade.update({ where: { id: existingTrade.id }, data: tradeData });
          tradesUpdated += 1;
        } else {
          await prisma.trade.create({ data: tradeData });
          tradesCreated += 1;
        }
      }
    }

    await prisma.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: "COMPLETED",
        message: `Wells ingestion ${reportType} completed.
Processed ${rowsProcessed} rows, failed ${rowsFailed}.`,
        rowsProcessed,
        rowsFailed,
        sourceReportDate,
        accountNumber: undefined,
        detailsJson: JSON.stringify({ failures }),
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      source: "WELLS_FARGO",
      reportType,
      rowsProcessed,
      rowsFailed,
      securitiesCreated,
      securitiesUpdated,
      positionsCreated,
      positionsUpdated,
      tradesCreated,
      tradesUpdated,
      failures,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
